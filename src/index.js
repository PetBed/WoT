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
const FlashcardSet = require('./models/flashcardSet');

// Collectible Models
const BaseItem = require('./models/collectible/baseItem');
const ItemModel = require('./models/collectible/itemModel');
const CollectedItem = require('./models/collectible/collectedItem');

const app = express();
mongoose.set('strictQuery', false);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORRECTED CORS MIDDLEWARE
app.use((req, res, next) => {
  // --- DEBUG LOG: Log all incoming requests ---
  console.log(`[BACKEND] Incoming Request: ${req.method} ${req.originalUrl}`);
	
  const allowedOrigins = [ 'http://127.0.0.1:5500', 'https://petbed.github.io', 'http://127.0.0.1:5501', 'http://127.0.0.1:5500/index.html', 'https://fcgh4w.csb.app', 'http://127.0.0.1:5501/Study%20Website/admin.html', 'https://petbed.github.io/Study%20Website/admin.html'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.some(allowedOrigin => origin?.startsWith(allowedOrigin))) { res.setHeader('Access-Control-Allow-Origin', origin); }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // FIX: Handle pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    console.log('[BACKEND] Handling pre-flight OPTIONS request. Sending 200 OK.');
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

//=======================================================
// Study Dashboard User API
//=======================================================
app.post("/api/study/register", async (req, res) => {
    const { username, email, password, securityQuestion, securityAnswer } = req.body;
    if (!username || !email || !password || !securityQuestion || !securityAnswer) {
        return res.status(400).json({ error: "Please enter all fields." });
    }
    try {
        let user = await StudyUser.findOne({ email });
        if (user) return res.status(400).json({ error: "User with this email already exists." });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const hashedSecurityAnswer = await bcrypt.hash(securityAnswer, salt);

        const newUser = new StudyUser({
            username,
            email,
            password: hashedPassword,
            securityQuestion,
            securityAnswer: hashedSecurityAnswer,
            settings: { darkMode: false }
        });

        await newUser.save();
        res.status(201).json({
            message: "User registered successfully!",
            user: { 
                id: newUser.id, 
                username: newUser.username, 
                email: newUser.email, 
                settings: newUser.settings,
                accumulatedStudyTime: newUser.accumulatedStudyTime,
                unclaimedDrops: newUser.unclaimedDrops
            },
        });
    } catch (e) {
        res.status(500).json({ error: "Server error: " + e.message });
    }
});
app.post("/api/study/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Please enter all fields." });
    try {
        const user = await StudyUser.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });

        let needsSave = false;
        if (typeof user.soundLibrary === 'undefined') {
            user.soundLibrary = [];
            needsSave = true;
        }
        if (typeof user.inventory === 'undefined') {
            user.inventory = [];
            needsSave = true;
        }
        if (typeof user.accumulatedStudyTime === 'undefined') {
            user.accumulatedStudyTime = 0;
            needsSave = true;
        }
        if (typeof user.unclaimedDrops === 'undefined') {
            user.unclaimedDrops = 0;
            needsSave = true;
        }
        if (needsSave) {
            await user.save();
        }

        res.status(200).json({
            message: "Login successful!",
            user: { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                settings: user.settings,
                accumulatedStudyTime: user.accumulatedStudyTime,
                unclaimedDrops: user.unclaimedDrops
            },
        });
    } catch (e) {
        res.status(500).json({ error: "Server error: " + e.message });
    }
});

// --- Password Reset Endpoints ---
app.post('/api/study/forgot-password/step1', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    try {
        const user = await StudyUser.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User with this email not found.' });
        res.json({ userId: user.id, securityQuestion: user.securityQuestion });
    } catch (e) {
        res.status(500).json({ error: "Server error: " + e.message });
    }
});

app.post('/api/study/forgot-password/step2', async (req, res) => {
    const { userId, securityAnswer, newPassword } = req.body;
    if (!userId || !securityAnswer || !newPassword) return res.status(400).json({ error: 'All fields are required.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters long.' });

    try {
        const user = await StudyUser.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const isAnswerMatch = await bcrypt.compare(securityAnswer, user.securityAnswer);
        if (!isAnswerMatch) return res.status(400).json({ error: 'Incorrect answer to security question.' });
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.status(200).json({ message: 'Password has been reset successfully!' });
    } catch (e) {
        res.status(500).json({ error: "Server error: " + e.message });
    }
});

//=======================================================
// Study Dashboard User Settings API
//=======================================================
app.put('/api/study/user/username', async (req, res) => {
    const { userId, newUsername } = req.body;
    if (!userId || !newUsername) return res.status(400).json({ error: 'User ID and new username are required.' });
    if (newUsername.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
    try {
        const existingUser = await StudyUser.findOne({ username: newUsername });
        if (existingUser && existingUser._id.toString() !== userId) {
            return res.status(400).json({ error: 'Username is already taken.' });
        }
        const user = await StudyUser.findByIdAndUpdate(userId, { username: newUsername }, { new: true });
        if (!user) return res.status(404).json({ error: 'User not found.' });
        res.status(200).json({
            message: 'Username updated successfully!',
            user: { id: user.id, username: user.username, email: user.email, settings: user.settings }
        });
    } catch (e) {
        res.status(500).json({ error: "Server error: " + e.message });
    }
});
app.put('/api/study/user/password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !currentPassword || !newPassword) return res.status(400).json({ error: 'All fields are required.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    try {
        const user = await StudyUser.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect current password.' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        res.status(200).json({ message: 'Password updated successfully!' });
    } catch (e) {
        res.status(500).json({ error: "Server error: " + e.message });
    }
});

app.put('/api/study/settings/darkmode', async (req, res) => {
    const { userId, darkMode } = req.body;
    console.log(req.body);
    if (!userId || typeof darkMode !== 'boolean') {
        return res.status(400).json({ error: 'User ID and dark mode setting are required.' });
    }
    try {
        const user = await StudyUser.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        user.settings.darkMode = darkMode;
        await user.save();
        res.status(200).json({ message: 'Settings updated successfully!', settings: user.settings });
    } catch (e) {
        res.status(500).json({ error: "Server error: " + e.message });
    }
});

//=======================================================
// Study Dashboard Task API
//=======================================================
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
        const task = new Task({ ...req.body, subTasks: [] });
        await task.save();
        res.status(201).json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.put('/api/study/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.delete('/api/study/tasks/:id', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.id);
        res.json({ message: 'Task deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
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
app.put('/api/study/tasks/:id/subtasks/:subtaskId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const subTask = task.subTasks.id(req.params.subtaskId);
        if (!subTask) return res.status(404).json({ error: 'Sub-task not found' });

        // Update fields based on what's provided in the request body
        if (req.body.text) {
            subTask.text = req.body.text;
        }
        if (typeof req.body.completed === 'boolean') {
            subTask.completed = req.body.completed;
        }

        await task.save();
        res.json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/api/study/tasks/:id/subtasks/:subtaskId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        // Correctly pull the subtask from the array
        task.subTasks.pull({ _id: req.params.subtaskId });

        await task.save();
        res.json(task);
    } catch (e) {
        console.error("Subtask deletion error:", e);
        res.status(500).json({ error: 'Failed to delete sub-task.' });
    }
});

//=======================================================
// Study Dashboard Data API (Logs & Streak)
//=======================================================
app.get('/api/study/logs', async (req, res) => {
    try {
        const user = await StudyUser.findById(req.query.userId);
        res.json(user.studyLogs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/study/logs', async (req, res) => {
    // --- DEBUG LOG: Log received body ---
    console.log('[BACKEND] Received PUT request on /api/study/logs');
    console.log('[BACKEND] Request Body:', req.body);
    try {
        const { userId, studyLogs } = req.body;
        console.log(`[BACKEND] Destructured - User ID: ${userId}, Logs: ${JSON.stringify(studyLogs)}`);
        
        if (!userId) {
            console.log('[BACKEND] Error: User ID is missing in the request body.');
            return res.status(400).json({ error: 'User ID is required.' });
        }

        const user = await StudyUser.findById(userId);
        if (!user) {
            console.log(`[BACKEND] Error: User not found for ID: ${userId}`);
            return res.status(404).json({ error: 'User not found' });
        }
        console.log(`[BACKEND] Found user: ${user.username}`);


        if (studyLogs && typeof studyLogs === 'object') {
            console.log('[BACKEND] Clearing old logs and setting new ones.');
            user.studyLogs.clear(); 
            for (const subject in studyLogs) {
                if (Object.prototype.hasOwnProperty.call(studyLogs, subject)) {
                    user.studyLogs.set(subject, studyLogs[subject]);
                }
            }
        }
        
        console.log('[BACKEND] Attempting to save user document...');
        await user.save();
        console.log('[BACKEND] User document saved successfully.');
        res.json({ message: 'Logs updated' });
    } catch (e) {
        // --- DEBUG LOG: Log the specific error from Mongoose/server ---
        console.error('[BACKEND] CRITICAL ERROR in /api/study/logs:', e);
        res.status(400).json({ error: e.message, details: e.toString() });
    }
});
app.get('/api/study/streak', async (req, res) => {
    try {
        const user = await StudyUser.findById(req.query.userId);
        res.json({ studyStreak: user.studyStreak, lastStudyDay: user.lastStudyDay });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/study/streak', async (req, res) => {
    try {
        const { userId, studyStreak, lastStudyDay } = req.body;
        await StudyUser.findByIdAndUpdate(userId, { studyStreak, lastStudyDay });
        res.json({ message: 'Streak updated' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ==========================================
// SOUND LIBRARY ROUTES
// ==========================================

// GET user's sound library
app.get('/api/study/sound-library', async (req, res) => {
    try {
        const user = await StudyUser.findById(req.query.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user.soundLibrary || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ADD a new sound to the library
app.post('/api/study/sound-library/add', async (req, res) => {
    try {
        const { userId, name, url } = req.body;
        if (!name || !name.trim() || !url || !url.trim()) {
             return res.status(400).json({ error: 'Name and URL cannot be empty.' });
        }
        const user = await StudyUser.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.soundLibrary.push({ name, url });
        await user.save();
        res.status(201).json(user.soundLibrary);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE a sound from the library
app.delete('/api/study/sound-library/delete/:soundId', async (req, res) => {
    try {
        const { userId } = req.body;
        const { soundId } = req.params;
        const user = await StudyUser.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        user.soundLibrary.pull({ _id: soundId });
        await user.save();
        res.json(user.soundLibrary);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// UPDATE a sound in the library
app.put('/api/study/sound-library/edit/:soundId', async (req, res) => {
    try {
        const { userId, name, url } = req.body;
        const { soundId } = req.params;
        if (!name || !name.trim() || !url || !url.trim()) {
             return res.status(400).json({ error: 'Name and URL cannot be empty.' });
        }
        const user = await StudyUser.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const sound = user.soundLibrary.id(soundId);
        if (!sound) {
            return res.status(404).json({ error: 'Sound not found in library' });
        }
        sound.name = name;
        sound.url = url;
        await user.save();
        res.json(user.soundLibrary);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ADDED: All routes for the Flashcard feature
// ==========================================
// FLASHCARD SETS API
// ==========================================

// --- Flashcard Set Management ---

// GET all flashcard sets for a user
app.get('/api/study/flashcard-sets', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'User ID is required.' });
        const sets = await FlashcardSet.find({ userId }).sort({ updatedAt: -1 });
        res.json(sets);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET a single flashcard set by its ID
app.get('/api/study/flashcard-sets/:setId', async (req, res) => {
    try {
        const set = await FlashcardSet.findById(req.params.setId);
        if (!set) return res.status(404).json({ error: 'Flashcard set not found.' });
        // Optional: check if set.userId matches logged-in user for security
        res.json(set);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// POST (create) a new flashcard set
app.post('/api/study/flashcard-sets', async (req, res) => {
    try {
        // Destructure flashcards from the body along with other details
        const { name, subject, userId, flashcards } = req.body;
        const newSet = new FlashcardSet({
            name,
            subject,
            userId: userId,
            // Use the provided flashcards array, defaulting to an empty array if it's not present
            flashcards: flashcards || []
        });
        await newSet.save();
        res.status(201).json(newSet);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PUT (update) a flashcard set's details
app.put('/api/study/flashcard-sets/:setId', async (req, res) => {
    try {
        const { name, subject, flashcards } = req.body; // Added flashcards to destructuring
        const updateData = { name, subject };

        // Only include the flashcards field in the update if it's provided in the request
        if (Array.isArray(flashcards)) {
            // Basic validation for the flashcards array
            updateData.flashcards = flashcards.map(card => ({
                front: card.front || '',
                back: card.back || ''
            }));
        }

        const updatedSet = await FlashcardSet.findByIdAndUpdate(
            req.params.setId,
            updateData,
            { new: true, runValidators: true }
        );
        if (!updatedSet) return res.status(404).json({ error: 'Flashcard set not found.' });
        res.json(updatedSet);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE a flashcard set
app.delete('/api/study/flashcard-sets/:setId', async (req, res) => {
    try {
        const deletedSet = await FlashcardSet.findByIdAndDelete(req.params.setId);
        if (!deletedSet) return res.status(404).json({ error: 'Flashcard set not found.' });
        res.json({ message: 'Flashcard set deleted successfully.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- Individual Flashcard Management within a Set ---

// POST (add) a new card to a set
app.post('/api/study/flashcard-sets/:setId/cards', async (req, res) => {
    try {
        const { front, back } = req.body;
        if (!front || !back) {
            return res.status(400).json({ error: 'Front and back content are required.' });
        }
        const set = await FlashcardSet.findById(req.params.setId);
        if (!set) return res.status(404).json({ error: 'Flashcard set not found.' });

        set.flashcards.push({ front, back });
        await set.save();
        res.status(201).json(set);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PUT (update) a single card within a set
app.put('/api/study/flashcard-sets/:setId/cards/:cardId', async (req, res) => {
    try {
        const { front, back } = req.body;
        const set = await FlashcardSet.findById(req.params.setId);
        if (!set) return res.status(404).json({ error: 'Flashcard set not found.' });

        const card = set.flashcards.id(req.params.cardId);
        if (!card) return res.status(404).json({ error: 'Flashcard not found in this set.' });

        card.front = front || card.front;
        card.back = back || card.back;
        
        await set.save();
        res.json(set);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE a single card from a set
app.delete('/api/study/flashcard-sets/:setId/cards/:cardId', async (req, res) => {
    try {
        const set = await FlashcardSet.findById(req.params.setId);
        if (!set) return res.status(404).json({ error: 'Flashcard set not found.' });

        set.flashcards.pull({ _id: req.params.cardId });
        
        await set.save();
        res.json(set);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/study/flashcard-sets/:setId/reorder-cards', async (req, res) => {
    try {
        const set = await FlashcardSet.findById(req.params.setId);
        if (!set) {
            return res.status(404).json({ error: 'Set not found' });
        }
        
        const { orderedIds } = req.body;
        if (!orderedIds || !Array.isArray(orderedIds)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        // Create a map for efficient lookup
        const cardMap = new Map(set.flashcards.map(card => [card._id.toString(), card]));
        
        // Build the new flashcards array based on the received order
        const reorderedFlashcards = orderedIds.map(id => cardMap.get(id)).filter(Boolean); // filter(Boolean) removes any undefined entries if an ID was invalid

        if (reorderedFlashcards.length !== set.flashcards.length) {
            return res.status(400).json({ error: 'ID mismatch, reorder failed' });
        }

        set.flashcards = reorderedFlashcards;
        await set.save();
        res.json(set);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// ADMIN - COLLECTIBLES API
// ==========================================

// --- Base Item Management (e.g., "Pencil", "Eraser") ---

// GET all base items
app.get('/api/admin/base-items', async (req, res) => {
    try {
        const items = await BaseItem.find().populate('rarityPools');
        res.json(items);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST (create) a new base item
app.post('/api/admin/base-items', async (req, res) => {
    try {
        const newBaseItem = new BaseItem(req.body);
        await newBaseItem.save();
        res.status(201).json(newBaseItem);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PUT (update) a base item
app.put('/api/admin/base-items/:id', async (req, res) => {
    try {
        const updatedItem = await BaseItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedItem) return res.status(404).json({ error: 'Base item not found.' });
        res.json(updatedItem);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE a base item
app.delete('/api/admin/base-items/:id', async (req, res) => {
    try {
        // Advanced: You might also want to delete all associated ItemModels here
        const deletedItem = await BaseItem.findByIdAndDelete(req.params.id);
        if (!deletedItem) return res.status(404).json({ error: 'Base item not found.' });
        res.json({ message: 'Base item deleted.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// --- Item Model Management (e.g., "BIC Pencil") ---

// GET all item models, with optional filtering by base item type
app.get('/api/admin/item-models', async (req, res) => {
    try {
        const filter = req.query.baseItemId ? { baseItemId: req.query.baseItemId } : {};
        const models = await ItemModel.find(filter).populate('baseItemId');
        res.json(models);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST (create) a new item model
app.post('/api/admin/item-models', async (req, res) => {
    try {
        const newItemModel = new ItemModel(req.body);
        await newItemModel.save();

        // Also update the parent BaseItem's rarityPools to include this new model
        await BaseItem.findByIdAndUpdate(newItemModel.baseItemId, {
            $push: { [`rarityPools.${newItemModel.rarity}`]: newItemModel._id }
        });

        res.status(201).json(newItemModel);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// PUT (update) an item model
app.put('/api/admin/item-models/:id', async (req, res) => {
    try {
        const updatedModel = await ItemModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedModel) return res.status(404).json({ error: 'Item model not found.' });
        // Advanced: If rarity changes, you would also need to update the old and new BaseItem rarityPools
        res.json(updatedModel);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE an item model
app.delete('/api/admin/item-models/:id', async (req, res) => {
    try {
        const deletedModel = await ItemModel.findByIdAndDelete(req.params.id);
        if (!deletedModel) return res.status(404).json({ error: 'Item model not found.' });

        // Also remove the reference from the parent BaseItem's rarityPools
        await BaseItem.findByIdAndUpdate(deletedModel.baseItemId, {
            $pull: { [`rarityPools.${deletedModel.rarity}`]: deletedModel._id }
        });

        res.json({ message: 'Item model deleted.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/base-items/:baseItemId/batch-models', async (req, res) => {
    try {
        const { models } = req.body;
        const { baseItemId } = req.params;

        if (!models || !Array.isArray(models)) {
            return res.status(400).json({ error: 'Invalid data format. "models" array is required.' });
        }

        const baseItem = await BaseItem.findById(baseItemId);
        if (!baseItem) {
            return res.status(404).json({ error: 'Base Item not found.' });
        }

        // Prepare models for insertion, ensuring the correct baseItemId is set
        const modelsToInsert = models.map(model => ({
            ...model,
            baseItemId: baseItemId 
        }));

        // Insert all new models into the database
        const createdModels = await ItemModel.insertMany(modelsToInsert, { ordered: false });
        
        // Group the new model IDs by rarity to update the parent
        const rarityGroups = {};
        createdModels.forEach(model => {
            if (!rarityGroups[model.rarity]) {
                rarityGroups[model.rarity] = [];
            }
            rarityGroups[model.rarity].push(model._id);
        });

        // Create the update operation for the parent BaseItem's rarityPools
        const updateOperation = {};
        for (const rarity in rarityGroups) {
            updateOperation[`rarityPools.${rarity}`] = { $each: rarityGroups[rarity] };
        }
        
        await BaseItem.findByIdAndUpdate(baseItemId, {
            $push: updateOperation
        });

        res.status(201).json({ message: `${createdModels.length} models imported successfully.` });

    } catch (e) {
        // Handle potential duplicate key errors from modelId, which is a common import issue
        if (e.code === 11000) {
             return res.status(400).json({ error: `Duplicate modelId found. All modelIds must be unique. Details: ${e.message}` });
        }
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/base-items/:baseItemId/batch-models', async (req, res) => {
    try {
        const { models } = req.body;
        const { baseItemId } = req.params;

        if (!models || !Array.isArray(models)) {
            return res.status(400).json({ error: 'Invalid data format. "models" array is required.' });
        }

        // 1. Verify Base Item exists
        const baseItem = await BaseItem.findById(baseItemId);
        if (!baseItem) {
            return res.status(404).json({ error: 'Base Item not found.' });
        }

        // 2. Delete all existing models for this base item
        await ItemModel.deleteMany({ baseItemId: baseItemId });

        // 3. Prepare and insert new models if any are provided
        if (models.length > 0) {
            const modelsToInsert = models.map(model => ({
                ...model,
                baseItemId: baseItemId
            }));
            const createdModels = await ItemModel.insertMany(modelsToInsert, { ordered: false });

            // 4. Rebuild the rarity pools from scratch
            const newRarityPools = {};
            createdModels.forEach(model => {
                if (!newRarityPools[model.rarity]) {
                    newRarityPools[model.rarity] = [];
                }
                newRarityPools[model.rarity].push(model._id);
            });
            baseItem.rarityPools = newRarityPools;
        } else {
            // If the text was empty, just clear the pools
            baseItem.rarityPools = {};
        }

        // 5. Update the parent BaseItem
        await baseItem.save();

        res.status(200).json({ message: `${models.length} models set successfully.` });

    } catch (e) {
        if (e.code === 11000) {
            return res.status(400).json({ error: `Duplicate modelId found. All modelIds must be unique. Details: ${e.message}` });
        }
        res.status(500).json({ error: e.message });
    }
});

// ==========================================
// COLLECTIBLE CARD GAME API
// ==========================================

// --- Configuration (can be moved to a separate file later) ---
const RARITY_TIERS = {
    common: { weight: 65, value: 1 },
    uncommon: { weight: 21, value: 2 },
    rare: { weight: 10, value: 4 },
    epic: { weight: 3, value: 10 },
    legendary: { weight: 0.9, value: 15 },
    mythic: { weight: 0.1, value: 30 },
};

const VERSION_CHANCES = {
    normal: { weight: 94, value: 1 },
    shiny: { weight: 3, value: 1.3 },
    inverted: { weight: 2, value: 1.15 },
    gold: { weight: 1, value: 1.5 },
};

const CONDITION_POOL = [
    { name: 'Damaged', value: 0.65 },
    { name: 'Worn', value: 0.8 },
    { name: 'Slightly Used', value: 1.0 },
    { name: 'New', value: 1.2 },
];

// Helper function to perform a weighted random selection
const getWeightedRandom = (options) => {
    const totalWeight = Object.values(options).reduce((sum, { weight }) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    for (const key in options) {
        if (random < options[key].weight) {
            return key;
        }
        random -= options[key].weight;
    }
};

// --- API Routes ---

// PUT (update) a user's study progress and calculate drops
app.put('/api/study/user/progress', async (req, res) => {
    try {
        const { userId, secondsStudied } = req.body;
        const user = await StudyUser.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const CARD_DROP_INTERVAL = 20 * 60; // 20 minutes in seconds

        user.accumulatedStudyTime += secondsStudied;
        
        let newDrops = 0;
        while (user.accumulatedStudyTime >= CARD_DROP_INTERVAL) {
            newDrops++;
            user.accumulatedStudyTime -= CARD_DROP_INTERVAL;
        }

        if (newDrops > 0) {
            user.unclaimedDrops = (user.unclaimedDrops || 0) + newDrops;
        }

        await user.save();
        res.json({
            accumulatedStudyTime: user.accumulatedStudyTime,
            unclaimedDrops: user.unclaimedDrops,
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// GET 3 generated card choices for a user to claim
app.get('/api/collectibles/generate-drop', async (req, res) => {
    try {
        const choices = [];
        const allBaseItems = await BaseItem.find();
        const allItemModels = await ItemModel.find();

        for (let i = 0; i < 3; i++) {
            const rarity = getWeightedRandom(RARITY_TIERS);
            const availableModels = allItemModels.filter(m => m.rarity === rarity);
            if (availableModels.length === 0) { i--; continue; }

            const selectedModel = availableModels[Math.floor(Math.random() * availableModels.length)];
            
            const baseItem = allBaseItems.find(b => b._id.equals(selectedModel.baseItemId));
            if (!baseItem) { i--; continue; } // Safety check

            // --- THIS IS THE FIX ---
            // Use the model's stat range only if it's a valid array with two numbers. Otherwise, fall back to the base item's default.
            const weightRange = (selectedModel.modelStats?.weightRange && selectedModel.modelStats.weightRange.length === 2)
                ? selectedModel.modelStats.weightRange
                : baseItem.defaultStats.weightRange;

            const priceRange = (selectedModel.modelStats?.priceRange && selectedModel.modelStats.priceRange.length === 2)
                ? selectedModel.modelStats.priceRange
                : baseItem.defaultStats.priceRange;

            const aestheticRange = (selectedModel.modelStats?.aestheticRange && selectedModel.modelStats.aestheticRange.length === 2)
                ? selectedModel.modelStats.aestheticRange
                : baseItem.defaultStats.aestheticRange;
            // --- END OF FIX ---
            
            const getRandomInRange = (range) => range && range.length === 2 ? Math.random() * (range[1] - range[0]) + range[0] : 0;
            
            const version = getWeightedRandom(VERSION_CHANCES);
            const condition = CONDITION_POOL[Math.floor(Math.random() * CONDITION_POOL.length)];
            const aestheticScore = Math.round(getRandomInRange(aestheticRange));
            const price = parseFloat(getRandomInRange(priceRange).toFixed(2));
            
            let collectorValue = (RARITY_TIERS[rarity].value * 10) + aestheticScore;
            collectorValue *= VERSION_CHANCES[version].value;
            collectorValue *= condition.value;
            collectorValue += price;

            const cardData = {
                itemModel: selectedModel,
                generatedStats: {
                    rarity,
                    version,
                    condition: condition.name,
                    aestheticScore,
                    collectorValue: Math.round(collectorValue),
                    weight: parseFloat(getRandomInRange(weightRange).toFixed(1)),
                    price,
                    color: selectedModel.colorOptions[Math.floor(Math.random() * selectedModel.colorOptions.length)] || null,
                }
            };
            choices.push(cardData);
        }
        res.json(choices);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


// POST (claim) a chosen card and add it to the user's inventory
app.post('/api/collectibles/claim-card', async (req, res) => {
    try {
        const { userId, chosenCard } = req.body;
        const user = await StudyUser.findById(userId);
        if (!user || user.unclaimedDrops < 1) {
            return res.status(400).json({ error: 'No drops to claim.' });
        }

        // Handle serial number for limited editions
        const itemModel = await ItemModel.findById(chosenCard.itemModel._id);
        if (itemModel.limitedEdition.isLimited) {
            if (itemModel.limitedEdition.mintedCount < itemModel.limitedEdition.maxSerial) {
                // Atomically increment and get the new count
                const updatedModel = await ItemModel.findByIdAndUpdate(
                    itemModel._id,
                    { $inc: { 'limitedEdition.mintedCount': 1 } },
                    { new: true }
                );
                chosenCard.generatedStats.serialNumber = `${updatedModel.limitedEdition.mintedCount}/${updatedModel.limitedEdition.maxSerial}`;
            } else {
                 chosenCard.generatedStats.serialNumber = `SOLD OUT`; // Or handle this case differently
            }
        }

        // Create the new collected item document
        const newCollectedItem = new CollectedItem({
            ownerId: userId,
            itemModelId: chosenCard.itemModel._id,
            generatedStats: chosenCard.generatedStats
        });
        await newCollectedItem.save();

        // Update the user's state
        user.unclaimedDrops -= 1;
        user.inventory.push(newCollectedItem._id);
        await user.save();

        res.status(201).json({
            message: 'Card claimed successfully!',
            unclaimedDrops: user.unclaimedDrops,
            newItem: newCollectedItem
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/collectibles/inventory', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required.' });
        }
        
        const user = await StudyUser.findById(userId).populate({
            path: 'inventory', // Populate the 'inventory' array in the StudyUser model
            populate: {
                path: 'itemModelId', // Within each inventory item, populate the 'itemModelId' field
                model: 'ItemModel'   // Tell Mongoose which model to use for this population
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(user.inventory);
    } catch (e) {
        res.status(500).json({ error: e.message });
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

