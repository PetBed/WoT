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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { return res.sendStatus(200); }
  next();
});


dotenv.config();

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO);
        console.log('Database connected');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// ===============================================================================================
// OTHER PROJECT API ROUTES
// ===============================================================================================

// == CUSTOMERS ==
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find({});
        res.json(customers);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// == USERS ==
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.get('/api/users/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/users', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const newUser = new User({ name, email, password });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.userId,
            { name, email, password },
            { new: true, runValidators: true }
        );
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(updatedUser);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.delete('/api/users/:userId', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.userId);
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// == NOTES ==
app.get('/api/notes/:userId', async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.params.userId });
        res.json(notes);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/notes', async (req, res) => {
    try {
        const { userId, content } = req.body;
        const newNote = new Note({ userId, content });
        await newNote.save();
        res.status(201).json(newNote);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.put('/api/notes/:noteId', async (req, res) => {
    try {
        const { content } = req.body;
        const updatedNote = await Note.findByIdAndUpdate(
            req.params.noteId,
            { content },
            { new: true }
        );
        if (!updatedNote) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(updatedNote);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.delete('/api/notes/:noteId', async (req, res) => {
    try {
        const deletedNote = await Note.findByIdAndDelete(req.params.noteId);
        if (!deletedNote) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ message: 'Note deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// == POST BOARD ==
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await PostBoard.find({}).populate('user', 'name').sort({ createdAt: -1 });
        res.json(posts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/posts', async (req, res) => {
    try {
        const { user, title, content } = req.body;
        const newPost = new PostBoard({ user, title, content });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.post('/api/posts/:postId/comment', async (req, res) => {
    try {
        const { user, text } = req.body;
        const post = await PostBoard.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        post.comments.push({ user, text });
        await post.save();
        res.status(201).json(post);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ===============================================================================================
// STUDY APP ROUTES
// ===============================================================================================

// == AUTH ==
app.post('/api/study/register', async (req, res) => {
    try {
        const { username, email, password, securityQuestion, securityAnswer } = req.body;
        const existingUser = await StudyUser.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedAnswer = await bcrypt.hash(securityAnswer, 10);
        const user = new StudyUser({ username, email, password: hashedPassword, securityQuestion, securityAnswer: hashedAnswer });
        await user.save();
        res.status(201).json({
            _id: user._id,
            username: user.username,
            settings: user.settings
        });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
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
            settings: user.settings
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
            return res.status(404).json({ error: 'User with that email not found.' });
        }
        res.json({ userId: user._id, securityQuestion: user.securityQuestion });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

// Forgot Password Step 2: Verify Answer and Reset Password
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

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password has been reset successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

// == USER SETTINGS ==
app.get('/api/study/settings', async (req, res) => {
    try {
        const user = await StudyUser.findById(req.query.userId);
        res.json(user.settings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.put('/api/study/settings', async (req, res) => {
    try {
        const { userId, settings } = req.body;
        const user = await StudyUser.findById(userId);
        user.settings = { ...user.settings, ...settings };
        await user.save();
        res.json(user.settings);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.put('/api/study/password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        const user = await StudyUser.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (e) {
        res.status(500).json({ error: 'An internal error occurred' });
    }
});

// == TASKS ==
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
        const { text, subject, time, deadline, userId, subTasks } = req.body;
        const task = new Task({ text, subject, time, deadline, userId, subTasks });
        await task.save();
        res.status(201).json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// NEW: Endpoint to update a task and its subtasks
app.put('/api/study/tasks/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const { text, subject, time, deadline, subTasks } = req.body;

        // Find the task and update it with the new data
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { text, subject, time, deadline, subTasks },
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(updatedTask);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.put('/api/study/tasks/:taskId/toggle', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        task.completed = !task.completed;
        await task.save();
        res.json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.delete('/api/study/tasks/:taskId', async (req, res) => {
    try {
        await Task.findByIdAndDelete(req.params.taskId);
        res.json({ message: 'Task deleted' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// == SUBTASKS ==
app.post('/api/study/tasks/:taskId/subtasks', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        const { text } = req.body;
        task.subTasks.push({ text, completed: false });
        await task.save();
        res.status(201).json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.put('/api/study/tasks/:taskId/subtasks/:subTaskId/toggle', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        const subTask = task.subTasks.id(req.params.subTaskId);
        subTask.completed = !subTask.completed;
        await task.save();
        res.json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
app.delete('/api/study/tasks/:taskId/subtasks/:subTaskId', async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);
        task.subTasks.id(req.params.subTaskId).remove();
        await task.save();
        res.json(task);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// == STUDY LOGS AND STREAK ==
app.get('/api/study/logs', async (req, res) => {
    try {
        const user = await StudyUser.findById(req.query.userId);
        res.json(user.studyLogs);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
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

app.listen(8800, () => {
    connect();
    console.log('Server is running on port 8800');
});
