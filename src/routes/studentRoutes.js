const express = require('express');
const { createStudentController } = require('../controllers/studentController');
const { schemas, validate } = require('../validation/studentValidation');

function createStudentRouter(studentRepository) {
  const router = express.Router();
  const controller = createStudentController(studentRepository);

  router.get('/dashboard', controller.dashboard);
  router.get('/', validate(schemas.studentListQuery, 'query'), controller.list);
  router.get('/:id/attendance', controller.getAttendance);
  router.put('/:id/attendance/:date',
    validate(schemas.attendance),
    validate(schemas.attendanceParams, 'params'),
    controller.setAttendance);
  router.get('/:id/marks', controller.getMarks);
  router.post('/:id/marks', validate(schemas.createMark), controller.addMark);
  router.patch('/:id/marks/:markId', validate(schemas.updateMark), controller.updateMark);
  router.patch('/:id/profile', validate(schemas.updateStudent), controller.update);
  router.get('/:id', controller.getById);
  router.post('/', validate(schemas.createStudent), controller.create);
  router.patch('/:id', validate(schemas.updateStudent), controller.update);
  router.delete('/:id', controller.remove);

  return router;
}

module.exports = { createStudentRouter };