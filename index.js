const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
//middleware
app.use(cors());
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a2urmj8.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    async function run() {
        try {
            await client.connect();
            console.log('Database Connected!')
    
            //Get Tools

    
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