const Joi = require('joi');

function validDate(value, helpers) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return helpers.error('date.format');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    return helpers.error('date.format');
  }
  return value;
}

const dateField = Joi.string().custom(validDate);
const optionalStudentFields = {
  firstName: Joi.string().trim().min(1).max(255),
  lastName: Joi.string().trim().min(1).max(255),
  email: Joi.string().trim().email().max(255),
  dateOfBirth: Joi.string().allow('', null).max(255).custom((value, helpers) => {
    if (value === '' || value === null) return value;
    return validDate(value, helpers);
  }).messages({ 'date.format': 'dateOfBirth must be a valid date in YYYY-MM-DD format.' }),
  grade: Joi.string().allow('', null).max(255)
};

const schemas = {
  createStudent: Joi.object({
    ...optionalStudentFields,
    firstName: optionalStudentFields.firstName.required(),
    lastName: optionalStudentFields.lastName.required(),
    email: optionalStudentFields.email.required()
  }).unknown(false),
  updateStudent: Joi.object(optionalStudentFields).min(1).unknown(false),
  attendance: Joi.object({
    status: Joi.string().valid('present', 'absent', 'late', 'excused').required()
  }).unknown(false),
  attendanceParams: Joi.object({ date: dateField.required() }).unknown(true),
  createMark: Joi.object({
    subject: Joi.string().trim().min(1).max(255).required(),
    score: Joi.number().min(0).required(),
    maxScore: Joi.number().greater(0).default(100),
    date: dateField.default(() => new Date().toISOString().slice(0, 10))
  }).custom((mark, helpers) => mark.score > mark.maxScore
    ? helpers.error('mark.score')
    : mark).messages({ 'mark.score': 'score cannot exceed maxScore.' }).unknown(false),
  updateMark: Joi.object({
    subject: Joi.string().trim().min(1).max(255),
    score: Joi.number().min(0),
    maxScore: Joi.number().greater(0),
    date: dateField
  }).min(1).unknown(false),
  studentListQuery: Joi.object({
    search: Joi.string().trim().default(''),
    grade: Joi.string().trim().default(''),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }).unknown(true)
};

function validate(schema, source = 'body') {
  return (request, response, next) => {
    const { error, value } = schema.validate(request[source], { abortEarly: false });
    if (error) {
      return response.status(400).json({
        error: 'Validation failed.',
        details: error.details.map((detail) => detail.message)
      });
    }

    request.validated = { ...request.validated, [source]: value };
    return next();
  };
}

module.exports = { schemas, validate };