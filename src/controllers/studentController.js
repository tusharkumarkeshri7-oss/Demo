function createStudentController(students) {
  return {
    async list(request, response, next) {
      try {
        const page = Number.parseInt(request.query.page ?? '1', 10);
        const limit = Number.parseInt(request.query.limit ?? '20', 10);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
          return response.status(400).json({ error: 'page must be >= 1 and limit must be between 1 and 100.' });
        }
        const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
        const grade = typeof request.query.grade === 'string' ? request.query.grade.trim() : '';
        return response.json(await students.list({ search, grade, page, limit }));
      } catch (error) {
        return next(error);
      }
    },

    async getById(request, response, next) {
      try {
        const student = await students.findById(request.params.id);
        if (!student) return response.status(404).json({ error: 'Student not found.' });
        return response.json({ data: student });
      } catch (error) {
        return next(error);
      }
    },

    async create(request, response, next) {
      try {
        return response.status(201).json({ data: await students.create(request.body) });
      } catch (error) {
        return next(error);
      }
    },

    async update(request, response, next) {
      try {
        if (!await students.findById(request.params.id)) {
          return response.status(404).json({ error: 'Student not found.' });
        }
        return response.json({ data: await students.update(request.params.id, request.body) });
      } catch (error) {
        return next(error);
      }
    },

    async remove(request, response, next) {
      try {
        if (!await students.delete(request.params.id)) {
          return response.status(404).json({ error: 'Student not found.' });
        }
        return response.status(204).end();
      } catch (error) {
        return next(error);
      }
    }
  };
}

module.exports = { createStudentController };