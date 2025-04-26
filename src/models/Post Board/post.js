const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: String,
  date: Date,
});

const db = mongoose.connection.useDb('post_board');

module.exports = db.model('Post', postSchema);