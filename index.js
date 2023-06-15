require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

// create express app
const app = express();
const port = process.env.PORT || 5000;

// middleweres
app.use(cors());
app.use(express.json());

// verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.stastu(401).send({
      error: true,
      message: "unauthorized access",
    });
  }
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        error: true,
        message: "unauthorized access",
      });
    }

    req.decoded = decoded;
  });
  next();
};

// create jwt
app.post("/jwt", (req, res) => {
  const email = req.body.email;
  const token = jwt.sign({ user: email }, process.env.JWT_SECRET, {
    expiresIn: "24h",
  });
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
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );

    // db
    const db = client.db("fluency");
    const userCollection = db.collection("users");
    const classCollection = db.collection("classes");
    const cartCollection = db.collection("cart");

    // users API
    app.get("/users", async (req, res) => {
      let query = {};
      if (req.query.role) {
        query.role = req.query.role;
      }

      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const query = {
        email: req.body?.email,
      };

      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ user: isExist });
      }
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    app.patch("/users/:id", verifyJWT, async (req, res) => {
      const userId = req.params.id;
      const newRole = req.body.role;
      const filter = { _id: new ObjectId(userId) };
      const result = await userCollection.updateOne(filter, {
        $set: {
          role: newRole,
        },
      });

      console.log(userId, newRole, result);

      res.send(result);
    });
    // verify is admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params?.email;
      const decodedUser = req.decoded?.user;

      if (decodedUser !== email) {
        res.status(403).send({ error: true, message: "Forbidden acccess" });
      }

      const query = { email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // verify is instructor

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    // decect role
    app.get("/users/user", verifyJWT, async (req, res) => {
      const decodedUser = req.decoded.user;
      const email = req.query.email;

      if (email !== decodedUser) {
        return res.status(403).send({
          error: true,
          message: "forbidden access",
        });
      }

      const query = { email };
      const user = await userCollection.findOne(query);
      console.log(user);
      const role = user?.role;
      res.send({ role });
    });

    // classes API
    app.get("/classes", async (req, res) => {
      let query = {};
      if (req.query.status) {
        query.status = req.query.status;
      }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    // cart APIs
    app.get("/cart", verifyJWT, async (req, res) => {
      const decodedUser = req.decoded.user;
      const email = req.query.email;

      if (email !== decodedUser) {
        return res.status(403).send({
          error: true,
          message: "forbidden access",
        });
      }

      const query = {
        student_email: decodedUser,
        student_status: req.query.status,
      };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/cart", verifyJWT, async (req, res) => {
      const decodedUser = req.decoded.user;
      const email = req.query.email;

      console.log(decodedUser, email);

      if (email !== decodedUser) {
        return res.status(403).send({
          error: true,
          message: "forbidden access",
        });
      }

      const query = {
        student_email: req.query.email,
        class_id: req.body.class_id,
      };
      console.log(query);
      const isExist = await cartCollection.findOne(query);
      console.log(isExist);
      if (isExist) {
        return res.send({ message: "already exist" });
      }

      const newItem = req.body;

      const result = await cartCollection.insertOne(newItem);
      res.send(result);
    });

    app.delete("/cart/:id", verifyJWT, async (req, res) => {
      const decodedUser = req.decoded.user;
      const email = req.query.email;

      console.log(decodedUser, email);

      if (email !== decodedUser) {
        return res.status(403).send({
          error: true,
          message: "forbidden access",
        });
      }

      const filter = {
        _id: new ObjectId(req.params.id),
      };

      const result = await cartCollection.deleteOne(filter);
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
