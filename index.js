require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


// middlewares
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gekes.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewsCollection = client.db("bistroDb").collection("reviews");
        const cartsCollection = client.db("bistroDb").collection("carts");
        const usersCollection = client.db("bistroDb").collection("users");

        // JWT related APIs
        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1h"
            });
            res.send({token});
        });

        // middlewares
        const verifyToken = (req, res, next) => {
            console.log("Inside verify token", req.headers.authorization);
            if(!req.headers.authorization){
                return res.status(401).send({message: "unauthorized access"});
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if(err){
                    return res.status(401).send({message: "unauthorized access"});
                }
                req.decoded = decoded;
                next();
            })
            
        };

        // use verify admin after verifyToken
        const verifyAdmin = async(req, res, next) => {
            const email = req.decoded.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if(!isAdmin){
                return res.status(403).send({message: "forbidden access"});
            }
            next();
        };


        // menu collection operations
        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        });
        app.post("/menu", verifyToken, verifyAdmin, async(req, res) => {
            const menu = req.body;
            const result = await menuCollection.insertOne(menu);
            res.send(result);
        });
        app.delete("/menu/:id", async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        });
        app.get("/menu/:id", async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await menuCollection.findOne(query);
            res.send(result);
        });
        app.patch("/menu/:id", async(req, res) => {
            const item = req.body;
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const updatedDoc = {
                $set:{
                    name: item.name,
                    category:item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
            }
            const result = await menuCollection.updateOne(query, updatedDoc);
            res.send(result);
        })
        // reviews collection operations
        app.get("/reviews", async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        });
        // carts collection operation
        app.post("/carts", async (req, res) => {
            const itemCart = req.body;
            const result = await cartsCollection.insertOne(itemCart);
            res.send(result);
        });
        app.get("/carts", async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        });
        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartsCollection.deleteOne(query);
            res.send(result);
        });
        // users collection operations
        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user?.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already axists", insertedId: null });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });
        app.delete("/users/:id", verifyAdmin, verifyToken, async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });
        // kono akta spcefic feild k updatae korar jonno patch use korte hoy
        app.patch("/users/admin/:id", verifyToken, verifyAdmin, async(req, res) => {
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const updatedDoc = {
                $set: {
                    role: "admin"
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });
        app.get("/users/admin/:email", verifyToken, async(req, res) => {
            const email = req.params.email;
            if(email !== req.decoded.email){
                return res.status(403).send({message: "forbidden access"})
            }
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            let admin = false;
            if(user){
                admin = user?.role === "admin"
            }
            res.send({admin});

        });

        // payment intent
        app.post("/create-payment-intent", async(req, res) => {
            const {price} = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Bistrto Boss server is running now")
})
app.listen(port, () => {
    console.log(`Bistro Boss server is running on port${port}`);
})