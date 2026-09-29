const express = require('express');
const { createStudentController } = require('../controllers/studentController');
const { validateStudent } = require('../middleware/validateStudent');

function createStudentRouter(studentRepository) {
  const router = express.Router();
  const controller = createStudentController(studentRepository);

  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/', validateStudent(), controller.create);
  router.patch('/:id', validateStudent({ partial: true }), controller.update);
  router.delete('/:id', controller.remove);

  return router;
}

module.exports = { createStudentRouter };