require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
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
        // menu collection operations
        app.get("/menu", async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result);
        });
        // reviews collection operations
        app.get("/reviews", async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        });
        // carts collection operation
        app.post("/carts", async(req, res) => {
            const itemCart = req.body;
            const result = await cartsCollection.insertOne(itemCart);
            res.send(result);
        });
        app.get("/carts", async(req, res) => {
            const email = req.query.email;
            const query = {email: email}
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        });
        app.delete("/carts/:id", async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await cartsCollection.deleteOne(query);
            res.send(result);
        });


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