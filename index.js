require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
// create express app
const app = express();

const port = process.env.PORT || 5000;

// middleweres
app.use(cors());
app.use(express.json());

// create jwt
app.post("/jwt", (req, res) => {
  const user = req.body.email;
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "24h" });
  res.send(token);
});

// verify is the server running
app.get("/", (req, res) => res.send("Fluency Server is running correctly"));

const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xfw1t3g.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

(async () => {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    // db
    const db = client.db("fluency");
    const userCollection = db.collection("users");

    // users API
    app.get("/users", async (req, res) => {
      let query = {};
      console.log(query);
      if (req.query) {
        query.role = req.query.role;
        console.log(query);
      }

      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
})().catch(console.dir);

// listen on PORT
app.listen(
  port,
  () => console.log(`Fluency server is running on port ${port}`),
);
