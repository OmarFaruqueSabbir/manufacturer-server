const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
//middleware
app.use(cors());
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a2urmj8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;
      next();
    });
  }

    async function run() {
        try {
            await client.connect();
            const toolsCollection = client.db('manufacturer').collection('tools');
            console.log('Database Connected!')
            const userCollection = client.db('manufacturer').collection('users');
            console.log('Database Connected!')
    
            //Get Tools
            app.get("/tools", async (req, res) => {
                const tools = await toolsCollection.find({}).toArray();
                res.send(tools);
              });

            //set user in Database
            app.put('/user/:email', async (req, res) => {
                const email = req.params.email
                const user = req.body
                const filter = { email: email }
                const options = { upsert: true }
                const updateDoc = {
                    $set: user,
                };
                const result = await userCollection.updateOne(filter, updateDoc, options)
                const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })
                res.send({ result, token });
    
            })

    
        } finally {
    
        }
    
    }
    run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Running Manufacturer Server');
});

app.listen(port,()=>{
    console.log('Listening to port', port);
})