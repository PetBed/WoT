const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Customer = require('./models/customer');

const app = express();
mongoose.set('strictQuery', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const customers = [
  {
    "name": "Acme Corporation",
    "industry": "Manufacturing",
  },
  {
    "name": "Globex Corporation",
    "industry": "Manufacturing",
  },
  {
    "name": "Soylent Corporation",
    "industry": "Food",
  },
]

const PORT = process.env.PORT || 3000;
const CONNECTION = process.env.CONNECTION;

const customer = new Customer({
  "name": "Acme Corporation",
  "industry": "Manufacturing",
});
// customer.save();

app.get("/", (req, res) => {
  res.send("Hello World");
});

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

// app.get("/api/customers/:id", async (req, res) => {
//   res.json({
//     requestParams: req.params,
//   })
// });

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