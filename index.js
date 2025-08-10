const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 3000
const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);
// middleware
app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.get('/', (req, res) => {
    res.send('hello world')
})
console.log()
// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hpujglf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const verifyFireBaseToken = async (req, res, next) => {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.decoded = decoded;
        next()
    }
    catch (error) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
}
async function run() {
    try {
        // await client.connect();
        const coursesCollection = client.db('courseDB').collection('courses');
        const enrollmentsCollection = client.db('courseDB').collection('enrollments');
        // get all
        app.get('/courses', async (req, res) => {
            const cursor = coursesCollection.find().sort({ createdAt: -1 }).limit(8);
            const result = await cursor.toArray();
            res.send(result);
        })
        // not sor t all courses
        app.get('/allCourses', async (req, res) => {
            try {
                const { title, sort } = req.query; 

                let query = {};
                let options = {};
                if (title) {
                    query.title = { $regex: title, $options: 'i' };
                }
                if (sort === 'asc') {
                    options.sort = { enrollCount: 1 };  
                } else if (sort === 'desc') {
                    options.sort = { enrollCount: -1 }; 
                }

                const cursor = coursesCollection.find(query, options);
                const result = await cursor.toArray();
                res.send(result);

            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        // get popularCourses
        app.get('/popularCourses', async (req, res) => {
            const cursor = coursesCollection.find().sort({ enrollCount: -1 }).limit(8);
            const result = await cursor.toArray();
            res.send(result)
        })
        // get id
        app.get('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await coursesCollection.findOne(query);
            res.send(result);
        })
        // get email
        app.get('/manageCourses', verifyFireBaseToken, async (req, res) => {
            const userEmail = req.query.instructorEmail;
            if (userEmail !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            if (!userEmail) {
                return res.status(400).send({ message: "Instructor email is required" });
            }
            const result = await coursesCollection.find({ instructorEmail: userEmail }).toArray();
            res.send(result);
        });
        // post
        app.post('/courses', async (req, res) => {
            const newCourse = req.body;
            newCourse.enrollCount = 0;
            newCourse.seat = 10;
            const result = await coursesCollection.insertOne(newCourse);
            res.send(result)
        })
        // update
        app.put('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const user = req.body;
            const updateDoc = {
                $set: user
            }
            const options = { upsert: true }
            const result = await coursesCollection.updateOne(query, updateDoc, options);
            res.send(result)
        })
        // delate
        app.delete('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await coursesCollection.deleteOne(query);
            res.send(result)
        })
        // enrollments api
        //get enrollments email 
        app.get('/enrollments', async (req, res) => {
            const userEmail = req.query.email;
            const query = {
                email: userEmail
            }
            const result = await enrollmentsCollection.find(query).toArray();
            res.send(result);
        })
        // myEnrolledCourses
        app.get('/myEnrolledCourses', verifyFireBaseToken, async (req, res) => {
            const userEmail = req.query.email;
            if (userEmail !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            if (!userEmail) {
                return res.status(400).send({ error: "Email is required" });
            }
            try {
                const enrollments = await enrollmentsCollection.find({ email: userEmail }).toArray();
                const enrolledCoursesWithDetails = [];
                for (const enrollment of enrollments) {
                    const courseId = enrollment.enrollId;
                    const courseDetails = await coursesCollection.findOne({ _id: new ObjectId(courseId) });
                    if (courseDetails) {
                        enrolledCoursesWithDetails.push({
                            _id: enrollment._id,
                            email: enrollment.email,
                            enrollId: enrollment.enrollId,
                            courseDetails
                        });
                    }
                }
                res.send(enrolledCoursesWithDetails);
            } catch (error) {
                console.error("Error in /myEnrolledCourses:", error);
                res.status(500).send({ error: "Something went wrong" });
            }
        });
        // enrollments post
        app.post('/enrollments', async (req, res) => {
            const newEnrollments = req.body;
            const result = await enrollmentsCollection.insertOne(newEnrollments);
            res.send(result);
        })
        // delate id
        app.delete('/enrollments/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await enrollmentsCollection.deleteOne(query);
            res.send(result);
        })
        // delate unenroll api
        app.delete('/enrollments', async (req, res) => {
            const { email, enrollId } = req.query;
            const result = await enrollmentsCollection.deleteOne({ email, enrollId });
            res.send(result)
        })
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {

    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`listen port : ${port}`)
})