function errorHandler(error, _request, response, _next) {
  if (error.type === 'entity.parse.failed') {
    return response.status(400).json({ error: 'Request body contains invalid JSON.' });
  }
  if (error.code === 11000) {
    return response.status(409).json({ error: 'A student with this email already exists.' });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return response.status(400).json({ error: 'Validation failed.', details: [error.message] });
  }
  console.error(error);
  return response.status(500).json({ error: 'Internal server error.' });
}

module.exports = { errorHandler };