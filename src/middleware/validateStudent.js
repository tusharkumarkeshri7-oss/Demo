const fields = ['firstName', 'lastName', 'email', 'dateOfBirth', 'grade'];

function validateStudent({ partial = false } = {}) {
  return (request, response, next) => {
    const input = request.body;
    const errors = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return response.status(400).json({
        error: 'Validation failed.',
        details: ['Request body must be a JSON object.']
      });
    }

    const unknown = Object.keys(input).filter((field) => !fields.includes(field));
    if (unknown.length) errors.push(`Unknown field(s): ${unknown.join(', ')}.`);

    for (const field of ['firstName', 'lastName', 'email']) {
      if ((!partial || input[field] !== undefined) &&
          (typeof input[field] !== 'string' || !input[field].trim())) {
        errors.push(`${field} is required and must be a non-empty string.`);
      }
    }

    for (const field of fields) {
      if (input[field] !== undefined && input[field] !== null && typeof input[field] !== 'string') {
        errors.push(`${field} must be a string.`);
      }
      if (typeof input[field] === 'string' && input[field].length > 255) {
        errors.push(`${field} must be 255 characters or fewer.`);
      }
    }

    if (input.email !== undefined && typeof input.email === 'string' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
      errors.push('email must be a valid email address.');
    }

    if (input.dateOfBirth !== undefined && input.dateOfBirth !== null && input.dateOfBirth !== '') {
      const date = new Date(input.dateOfBirth);
      if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== input.dateOfBirth) {
        errors.push('dateOfBirth must be a valid date in YYYY-MM-DD format.');
      }
    }

    if (partial && Object.keys(input).length === 0) {
      errors.push('Provide at least one field to update.');
    }

    if (errors.length) {
      return response.status(400).json({ error: 'Validation failed.', details: errors });
    }
    return next();
  };
}

module.exports = { validateStudent };