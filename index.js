const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const cors = require('cors');
const app = express();
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 3000




// med el wer
app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) =>{
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

async function run() {
    try{
            await client.connect();
            const coursesCollection = client.db('courseDB').collection('courses');
            const userCollection = client.db('courseDB').collection('enrollments');

            // get all
            app.get('/courses', async(req, res) =>{
                const cursor = coursesCollection.find().sort({createdAt: -1}).limit(6);
                const result = await cursor.toArray();
                res.send(result);
            })

            // get popularCourses
            app.get('/popularCourses', async(req, res) => {
                const cursor = coursesCollection.find().sort({enrollCount: -1}).limit(6);
                const result = await cursor.toArray();
                res.send(result)
            })

            // get id
            app.get('/courses/:id', async(req, res) =>{
                const id = req.params.id;
               
                const query = {_id: new ObjectId(id)};
                
                const result = await coursesCollection.findOne(query);
                res.send(result);
            })

            // get email
            app.get('/manageCourses', async(req, res) => {
                const userEmail = req.query.instructorEmail;
                const result = await coursesCollection.find({email: userEmail}).toArray();
                res.send(result);
            })
            // post
            app.post('/courses', async(req, res) =>{
                const newCourse = req.body;
                newCourse.enrollCount = 0;
                const result = await coursesCollection.insertOne(newCourse);
                res.send(result)
            })

            // update
            app.put('/courses/:id', async(req, res) => {
                const id = req.params.id;
                const query = {_id : new ObjectId(id)};
                const user = req.body;
                const updateDoc = {
                    $set: user
                }
                const options = {upsert : true}
                const result = await coursesCollection.updateOne(query, updateDoc, options);
                res.send(result)
            })

            // delate
            app.delete('/courses/:id', async(req, res) =>{
                const id = req.params.id;
                const query = {_id: new ObjectId(id)};
                const result = await coursesCollection.deleteOne(query);
                res.send(result)
            })

            // enrollments api


            // enrollments email
            app.get('/enrollments', async(req, res) => {
                const email = req.query.email;
                const result = await userCollection.find({email}).toArray();
                res.send(result);
            })

            // enrollments post
            app.post('/enrollments', async(req, res) =>{
                const newEnrollments = req.body;
                const result = await userCollection.insertOne(newEnrollments);
                res.send(result);
            })















              await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally{

    }
}

run().catch(console.dir);

app.listen(port, () =>{
    console.log(`listen port : ${port}`)
})