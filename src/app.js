const express = require('express');
const { createStudentRouter } = require('./routes/studentRoutes');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');

function createApp(studentRepository) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.use('/api/students', createStudentRouter(studentRepository));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };