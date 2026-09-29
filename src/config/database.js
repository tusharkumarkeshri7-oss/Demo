const mongoose = require('mongoose');

const defaultUri = 'mongodb://127.0.0.1:27017/student_management';

async function connectDatabase(uri = process.env.MONGODB_URI || defaultUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri);
  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };