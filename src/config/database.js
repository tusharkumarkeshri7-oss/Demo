const mongoose = require('mongoose');

const defaultUri = 'mongodb+srv://CompleteBackend:HMH3Ow8b5nzrLJ71@cluster0.spokv3p.mongodb.net/student_management';

async function connectDatabase(uri = process.env.MONGODB_URI || defaultUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri);
  console.log("Database connected successfully")
  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };