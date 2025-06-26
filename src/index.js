const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const cheerio = require('cheerio');

const Customer = require('./models/customer');
const User = require('./models/user');
const Note = require('./models/note');
const PostBoard = require('./models/Post Board/post');

const app = express();
mongoose.set('strictQuery', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://127.0.0.1:5500', 
    'https://petbed.github.io',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:5500/index.html',
    'https://fcgh4w.csb.app',

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
const POST_BOARD_CONNECTION = process.env.POST_BOARD_CONNECTION;

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

//=======================================================
// Notes API
//=======================================================
app.get("/api/notes", async (req, res) => {
  const noteId = req.query.noteId;
  const userId = req.query.userId;

  try {
    const notes = await Note.find();

    if (noteId && userId) {
      res.json({"error": "Only one query parameter is allowed"});
    } else if (noteId) {
      const note = await Note.findById(noteId);
      if (!note) {
        res.status(404).json({ error: "Note not found" });
      } else {
        res.json({ note });
      }
    } else if (userId) {
      const userNotes = await Note.find({ user: userId });
      res.json({ notes: userNotes });
      if (!userNotes) {
        res.status(404).json({ error: "Notes not found" });
      }
    } else {
      res.json({ notes });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/notes", async (req, res) => {
  const { title, content, userId } = req.body;
  if (!title || !userId) {
    return res.status(400).json({ error: "Title, and userId are required" });
  }

  const note = new Note({
    title,
    content,
    user: userId,
  });
  try {
    await note.save();
    res.status(201).json({ note });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/api/notes", async (req, res) => {
  try {
    const noteId = req.query.id;
    const result = await Note.deleteOne({_id: noteId});
    res.json({deletedCount: result.deletedCount});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.put("/api/notes", async (req, res) => {
  try {
    const noteId = req.query.id;
    const result = await Note.replaceOne({_id: noteId}, req.body);
    res.json({updatedCount: result.modifiedCount});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

//=======================================================
// Post Board API
//=======================================================
app.get("/api/postboard", async (req, res) => {
  const postId = req.query.postId;

  try {
    const posts = await PostBoard.find();

    if (postId) {
      const post = await PostBoard.findById(postId);
      if (!post) {
        res.status(404).json({ error: "Post not found" });
      } else {
        res.json({ post });
      }
    } else {
      res.json({ posts });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/postboard", async (req, res) => {
  const { content, date } = req.body;
  if (!content || !date) {
    return res.status(400).json({ error: "Content and date is required" });
  }

  const post = new PostBoard({
    content,
    date: new Date(date),
  });
  try {
    await post.save();
    res.status(201).json({ post });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/api/postboard", async (req, res) => {
  try {
    const postId = req.query.id;
    const result = await PostBoard.deleteMany({});
    res.json({deletedCount: result.deletedCount});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

app.put("/api/postboard", async (req, res) => {
  try {
    const noteId = req.query.id;
    const result = await Note.replaceOne({_id: noteId}, req.body);
    res.json({updatedCount: result.modifiedCount});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

//=======================================================
// SDG News Scrapper
//=======================================================
app.get("/api/sdgnews", async (req, res) => {
  var allNews = await fetchSDGNewsFirstPages(2);
  res.json({ allNews });
});


async function fetchSDGNewsPage(page) {
  try {
    const url = `https://sdgs.un.org/news?page=%2C%2C${page}`;
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const newsItems = [];

    $('.tabs-button .card').each((index, element) => {
      const title = $(element).find('.card-title').text().trim();
      const link = 'https://sdgs.un.org' + $(element).find('.card-body > a').attr('href');
      const date = $(element).find('.card-date').text().trim();
      const summary = $(element).find('.card-text').text().trim();
      const goals = $(element).find('.badge a').map((i, el) => $(el).text().trim()).get();
      const image = 'https://sdgs.un.org' + $(element).find('.card-img-top').attr('src');

      newsItems.push({ title, link, date, summary, goals, image });
    });

    return newsItems;
  } catch (error) {
    console.error('Error fetching SDG news:', error);
  }
}

async function fetchSDGNewsFirstPages(n) {
  // let allNews = [];
  // for (let i = 0; i < n; i++) {
  //   const pageNews = await fetchSDGNewsPage(i);
  //   console.log(`Fetched ${pageNews.length} items from page ${i}`);
  //   allNews = allNews.concat(pageNews);
  // }
  // return allNews;
  
  try {
    const pages = Array.from({ length: n }, (_, i) => i);
    const results = await Promise.all(pages.map(fetchSDGNewsPage));
    return results.flat();
  } catch (error) {
    console.error("Error fetching SDG news pages:", error);
  }
}

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
