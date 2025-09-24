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

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const PORT = process.env.PORT || 3000;
const CONNECTION = process.env.CONNECTION;

app.get("/", (req, res) => { res.send("Hello World"); });

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

// Signup
app.post('/api/study/signup', async (req, res) => {
    try {
        const { username, email, password, securityQuestion, securityAnswer } = req.body;

        const existingUser = await StudyUser.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const hashedAnswer = await bcrypt.hash(securityAnswer, salt);

        const newUser = new StudyUser({
            username,
            email,
            password: hashedPassword,
            securityQuestion,
            securityAnswer: hashedAnswer,
        });

        await newUser.save();
        res.status(201).json({
            _id: newUser._id,
            username: newUser.username,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Login
app.post('/api/study/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await StudyUser.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        res.json({
            _id: user._id,
            username: user.username,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Forgot Password Step 1: Get Security Question
app.post('/api/study/forgot-password/step1', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await StudyUser.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User with this email not found.' });
        }
        res.json({ userId: user._id, securityQuestion: user.securityQuestion });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Forgot Password Step 2: Reset Password
app.post('/api/study/forgot-password/step2', async (req, res) => {
    try {
        const { userId, securityAnswer, newPassword } = req.body;
        const user = await StudyUser.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isAnswerMatch = await bcrypt.compare(securityAnswer, user.securityAnswer);
        if (!isAnswerMatch) {
            return res.status(400).json({ error: 'Incorrect answer to the security question.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password has been reset successfully!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Change Password
app.put('/api/study/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        const user = await StudyUser.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ message: 'Password updated successfully!' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Study App: Task Management ---

// Create a new task
// FIX: Changed route from /api/tasks to /api/study/tasks
app.post('/api/study/tasks', async (req, res) => {
    try {
        const { text, subject, time, deadline, userId, subTasks } = req.body;
        const newTask = new Task({ text, subject, time, deadline, userId, subTasks });
        await newTask.save();
        res.status(201).json(newTask);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Get all tasks for a user
// FIX: Changed route from /api/tasks to /api/study/tasks
app.get('/api/study/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.query.userId });
        res.json(tasks);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update a task
// FIX: Changed route from /api/tasks/:id to /api/study/tasks/:id
app.put('/api/study/tasks/:id', async (req, res) => {
    try {
        const { text, subject, time, deadline, subTasks, completed } = req.body;
        
        const taskToUpdate = {
            text,
            subject,
            time,
            deadline,
            completed,
            subTasks: Array.isArray(subTasks) ? subTasks : []
        };
        
        // Remove 'completed' if it's not explicitly sent in the body
        if (req.body.completed === undefined) {
            delete taskToUpdate.completed;
        }


        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id,
            { $set: taskToUpdate },
            { new: true, runValidators: true, omitUndefined: true }
        );

        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(updatedTask);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Delete a task
// FIX: Changed route from /api/tasks/:id to /api/study/tasks/:id
app.delete('/api/study/tasks/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Add a sub-task
// FIX: Changed route from /api/tasks/:id/subtasks to /api/study/tasks/:id/subtasks
app.post('/api/study/tasks/:id/subtasks', async (req, res) => {
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
// FIX: Changed route to be more specific and correct
app.put('/api/study/tasks/:taskId/subtasks/:subtaskId', async (req, res) => {
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
// FIX: Changed route to match the new pattern
app.delete('/api/study/tasks/:taskId/subtasks/:subtaskId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Mongoose sub-document removal
        const subTask = task.subTasks.id(req.params.subtaskId);
        if (subTask) {
             subTask.remove();
        } else {
            return res.status(404).json({ error: 'Sub-task not found' });
        }
        
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

