const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Customer = require('./models/customer');
const User = require('./models/user');

const app = express();
mongoose.set('strictQuery', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://127.0.0.1:5500', 
    'https://petbed.github.io'
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.some(allowedOrigin => origin?.startsWith(allowedOrigin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const PORT = process.env.PORT || 3000;
const CONNECTION = process.env.CONNECTION;

app.get("/", (req, res) => {
  res.send("Hello World");
});

//=======================================================
// Customer API
//=======================================================
app.get("/api/customers", async (req, res) => {
  // console.log(await mongoose.connection.db.listCollections().toArray());
  try {
    const result = await Customer.find();
    // res.json({"customers": result});

    const customerId = req.query.id;
    if (!customerId) {
      res.json({"customers": result});
    } else {
      console.log(customerId);
      const customer = await Customer.findById(customerId);
      console.log(customer);
      if (!customer) {
        res.status(404).json({"error": "Customer not found"});
      } else {
        res.json({customer});
      }
    }
  } catch (e) { 
    res.status(500).json({"error": e.message});
  }
});

app.put("/api/customers", async (req, res) => {
  try {
    const customerId = req.query.id;
    const result = await Customer.replaceOne({_id: customerId}, req.body);
    res.json({updatedCount: result.modifiedCount});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
})

app.delete("/api/customers", async (req, res) => {
  try {
    const customerId = req.query.id;
    const result = await Customer.deleteOne({_id: customerId});
    res.json({deletedCount: result.deletedCount});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
})

app.post("/api/customers", async (req, res) => {
  console.log(req.body);
  const customer = new Customer(req.body);
  try {
    await customer.save();
    res.status(201).json({customer});
  } catch (e) {
    res.status(400).json({error: e.message});
  }
});

//=======================================================
// User API
//=======================================================
app.get("/api/users", async (req, res) => {
  const userId = req.query.id;
  const result = await User.find();
  
  try {
    if (!userId) {
      res.json({"user": result});
    } else {
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({"error": "User not found"});
      } else {
        res.json({user});
      }
    }
  } catch (e) {
    res.status(500).json({"error": e.message});
  }
});

app.post("/api/users", async (req, res) => {
  const { username, password, email } = req.body;
  console.log(req.body);

  if (!username || !password || !email) {
    return res.status(400).json({ error: "Username, password, and email are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  const user = new User({ username, password, email });
  try {
    await user.save();
    res.json({
      userId: user._id,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/api/users", async (req, res) => {
  try {
    const userId = req.query.id;
    const result = await User.deleteOne({_id: userId});
    res.json({deletedCount: result.deletedCount});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.put("/api/users", async (req, res) => {
  try {
    const userId = req.query.id;
    const result = await User.replaceOne({_id: userId}, req.body);
    res.json({updatedCount: result.modifiedCount});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.get("/api/users/login", async (req, res) => {
  const { email, username, password } = req.query;
  console.log(email, username, password);

  if ((!email && !username) || !password) {
    console.log("Email/Username and password are required");
    return res.status(400).json({ error: "Email/Username and password are required" });
  }

  const query = email ? { email, password } : { username, password };
  const user = await User
    .findOne(query)
    .select('_id');

  if (!user) {
    console.log("User not found");
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ userId: user._id });
});

const start = async() => {
  try{
    await mongoose.connect(CONNECTION);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (e) {
    console.log(e.message);
  }
};

start();