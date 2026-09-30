require("dotenv").config();
const { createApp } = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { Student, createStudentModel } = require('./models/studentModel');

const port = Number.parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  await connectDatabase(process.env.MONGO_URI);
  const app = createApp(createStudentModel(Student));
  const server = app.listen(port, () => {
    console.log(`Student management API listening on http://localhost:${port}`);
  });

  function shutdown() {
    server.close(() => {
      disconnectDatabase().then(() => process.exit(0));
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch(async (error) => {
  console.error('Failed to start API:', error.message);
  await disconnectDatabase();
  process.exitCode = 1;
});