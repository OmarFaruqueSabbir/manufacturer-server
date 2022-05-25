const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
//middleware
app.use(cors());
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
        const reviewsCollection = client.db('manufacturer').collection('reviews');
        console.log('Database Connected!')
        const userCollection = client.db('manufacturer').collection('users');
        const ordersCollection = client.db('manufacturer').collection('orders');
        const paymentCollection = client.db('manufacturer').collection('payments')

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret })
        })




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


        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
          })
      
        //set admin
          app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
              $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
          })


        //get users in dashboard

        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        //Get Tools
        app.get("/tools", async (req, res) => {
            const tools = await toolsCollection.find({}).toArray();
            res.send(tools);
        });

        //get single tools
        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await toolsCollection.findOne(query);
            res.send(tool);
        });

        //Get Reviews
        app.get("/reviews", async (req, res) => {
            const reviews = await reviewsCollection.find({}).toArray();
            res.send(reviews);
        });

        //POST
        app.post('/reviews', async (req, res) => {
            const newReview = req.body;
            const result = await reviewsCollection.insertOne(newReview);
            res.send(result);
        });

        //post orders & Tools availablity update
        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const order = req.body;
            console.log(order)

            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    availableQuantity: order.newQuan,
                }
            }

            const result = await ordersCollection.insertOne(order.order);
            const updatedTools = await toolsCollection.updateOne(filter, updatedDoc);
            // sendPaymentConfirmationEmail(payment)
            res.send(updatedTools);
        })

        //get orders 
        app.get("/order",verifyJWT, async (req, res) => {
            let query
            const user = req.query.user
            const decodedEmail = req.decoded.email
            if (user) {
                if (user === decodedEmail) {
                    query = { user: user }
                    const cursor = ordersCollection.find(query);
                    const result = await cursor.toArray();
                    res.send(result);
                } else {
                    res.send({ success: 'Access Denied' })
                }

            } else {
                query = {}
                const cursor = ordersCollection.find(query);
                const result = await cursor.toArray();
                res.send(result);
            }
        });
    


        

        //get orders by Id
        app.get('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const orders = await ordersCollection.findOne(query);
            res.send(orders)

        })

        //  
        app.put('/order/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }

            const result = await paymentCollection.insertOne(payment);
            const updatedBooking = await ordersCollection.updateOne(filter, updatedDoc);
            res.send(updatedBooking);
        })


        //delete order item
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

    } finally {

    }

}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Running Manufacturer Server');
});

app.listen(port, () => {
    console.log('Listening to port', port);
})