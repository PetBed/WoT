const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const cheerio = require('cheerio');
const bcrypt = require('bcryptjs');

// Existing Models
const Customer = require('./models/customer');
const User = require('./models/user');
const Note = require('./models/note');
const PostBoard = require('./models/Post Board/post');

// Study App Models
const StudyUser = require('./models/studyUser');
const Task = require('./models/task'); // Task model for the study app

const app = express();
mongoose.set('strictQuery', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const allowedOrigins = [ 'http://127.0.0.1:5500', 'https://petbed.github.io', 'http://127.0.0.1:5501', 'http://127.0.0.1:5500/index.html', 'https://fcgh4w.csb.app', ];
  const origin = req.headers.origin;
  if (allowedOrigins.some(allowedOrigin => origin?.startsWith(allowedOrigin))) { res.setHeader('Access-Control-Allow-Origin', origin); }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  // FIX: Added 'Authorization' and ensured 'Content-Type' is explicitly allowed.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
  }
  next();
});

const dbURI = process.env.MONGODB_URI;
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

app.get('/api/scrape', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        return res.status(400).send({ error: 'URL is required' });
    }
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const title = $('title').text();
        const description = $('meta[name="description"]').attr('content');
        const headings = [];
        $('h1, h2, h3').each((i, el) => {
            headings.push($(el).text());
        });
        res.send({ title, description, headings });
    } catch (error) {
        res.status(500).send({ error: 'Failed to scrape the URL' });
    }
});

// GET all customers
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET a single customer
app.get('/api/customers/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (customer == null) {
            return res.status(404).json({ message: 'Cannot find customer' });
        }
        res.json(customer);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// CREATE a customer
app.post('/api/customers', async (req, res) => {
    const customer = new Customer({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone
    });

    try {
        const newCustomer = await customer.save();
        res.status(201).json(newCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// UPDATE a customer
app.put('/api/customers/:id', async (req, res) => {
    try {
        const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedCustomer);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a customer
app.delete('/api/customers/:id', async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted Customer' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/users', async(req,res) => {
    const allUsers = await User.find();
    return res.json(allUsers);
})

app.post('/api/users/register', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Check if the username already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
  
      // Create a new user
      const newUser = new User({ username, password });
      await newUser.save();
  
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/users/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Check if the user exists
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      // Check if the password is correct
      if (password !== user.password) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      res.json({ message: 'Login successful' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
});

//Get all notes
app.get('/api/notes', async (req, res) => {
    try {
      const notes = await Note.find();
      res.json(notes);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});
  
  // Create a new note
app.post('/api/notes', async (req, res) => {
    const note = new Note({
      title: req.body.title,
      content: req.body.content,
    });
  
    try {
      const newNote = await note.save();
      res.status(201).json(newNote);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
});
  
  // Update a note
app.put('/api/notes/:id', async (req, res) => {
    try {
      const updatedNote = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(updatedNote);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
});
  
  // Delete a note
app.delete('/api/notes/:id', async (req, res) => {
    try {
      await Note.findByIdAndDelete(req.params.id);
      res.json({ message: 'Note deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
});

//get all posts
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await PostBoard.find().populate('comments');
        res.json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//create a new post
app.post('/api/posts', async (req, res) => {
    const post = new PostBoard({
        title: req.body.title,
        content: req.body.content,
    });
    try {
        const newPost = await post.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

//get a post by id
app.get('/api/posts/:id', async (req, res) => {
    try {
        const post = await PostBoard.findById(req.params.id).populate('comments');
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update a post
app.put('/api/posts/:id', async (req, res) => {
    try {
        const post = await PostBoard.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


// --- Study App API ---

// START: Add missing Task Management GET and POST routes for the Study App
app.get('/api/study/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.query.userId });
        res.json(tasks);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/study/tasks', async (req, res) => {
    try {
        const { text, subject, time, deadline, userId } = req.body;
        const task = new Task({ text, subject, time, deadline, userId, completed: false, subTasks: [] });
        await task.save();
        res.status(201).json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
// END: Add missing Task Management routes

// Existing Task PUT for editing (we added this before)
app.put('/api/study/tasks/:id', async (req, res) => {
    try {
        const { text, subject, time, deadline, subTasks } = req.body;
        const task = await Task.findById(req.params.id);
        task.completed = req.body.completed;
        await task.save();
        res.json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Add a sub-task
app.post('/api/tasks/:id/subtasks', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const newSubTask = { text: req.body.text, completed: false };
        task.subTasks.push(newSubTask);
        await task.save();
        res.status(201).json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Mark a sub-task as complete/incomplete
app.put('/api/tasks/:taskId/subtasks/:subtaskId/complete', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const subTask = task.subTasks.id(req.params.subtaskId);
        if (!subTask) return res.status(404).json({ error: 'Sub-task not found' });

        subTask.completed = req.body.completed;
        await task.save();
        res.json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Delete a sub-task
app.delete('/api/tasks/:taskId/subtasks/:subtaskId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        task.subTasks.id(req.params.subtaskId).remove();
        await task.save();
        res.json(task);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- Study App: Study Logs, Streak, and Settings ---

// Get study logs
app.get('/api/study/logs', async (req, res) => {
    try {
        const user = await StudyUser.findById(req.query.userId);
        res.json(user.studyLogs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update study logs
app.put('/api/study/logs', async (req, res) => {
    try {
        const { userId, studyLogs } = req.body;
        const user = await StudyUser.findById(userId);
        user.studyLogs = studyLogs;
        await user.save();
        res.json({ message: 'Logs updated' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Get study streak
app.get('/api/study/streak', async (req, res) => {
    try {
        const user = await StudyUser.findById(req.query.userId);
        res.json({ studyStreak: user.studyStreak, lastStudyDay: user.lastStudyDay });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update study streak
app.put('/api/study/streak', async (req, res) => {
    try {
        const { userId, studyStreak, lastStudyDay } = req.body;
        await StudyUser.findByIdAndUpdate(userId, { studyStreak, lastStudyDay });
        res.json({ message: 'Streak updated' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Get user settings
app.get('/api/study/settings', async (req, res) => {
    try {
        const user = await StudyUser.findById(req.query.userId);
        res.json(user.settings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update user settings
app.put('/api/study/settings', async (req, res) => {
    try {
        const { userId, settings } = req.body;
        await StudyUser.findByIdAndUpdate(userId, { settings });
        res.json({ message: 'Settings updated' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
    app.listen(PORT, console.log(`Server is running on port ${PORT}`));
})

