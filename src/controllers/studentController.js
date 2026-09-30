function createStudentController(students) {
  return {
    async dashboard(_request, response, next) {
      try {
        return response.json({ data: await students.dashboard() });
      } catch (error) {
        return next(error);
      }
    },

    async list(request, response, next) {
      try {
        const { search, grade, page, limit } = request.validated.query;
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
        return response.status(201).json({ data: await students.create(request.validated.body) });
      } catch (error) {
        return next(error);
      }
    },

    async update(request, response, next) {
      try {
        if (!await students.findById(request.params.id)) {
          return response.status(404).json({ error: 'Student not found.' });
        }
        return response.json({ data: await students.update(request.params.id, request.validated.body) });
      } catch (error) {
        return next(error);
      }
    },

    async getAttendance(request, response, next) {
      try {
        const attendance = await students.getAttendance(request.params.id);
        if (!attendance) return response.status(404).json({ error: 'Student not found.' });
        return response.json({ data: attendance });
      } catch (error) {
        return next(error);
      }
    },

    async setAttendance(request, response, next) {
      try {
        const { date } = request.validated.params;
        const { status } = request.validated.body;
        const attendance = await students.setAttendance(request.params.id, date, status);
        if (!attendance) return response.status(404).json({ error: 'Student not found.' });
        return response.json({ data: attendance });
      } catch (error) {
        return next(error);
      }
    },

    async getMarks(request, response, next) {
      try {
        const marks = await students.getMarks(request.params.id);
        if (!marks) return response.status(404).json({ error: 'Student not found.' });
        return response.json({ data: marks });
      } catch (error) {
        return next(error);
      }
    },

    async addMark(request, response, next) {
      try {
        const mark = await students.addMark(request.params.id, request.validated.body);
        if (!mark) return response.status(404).json({ error: 'Student not found.' });
        return response.status(201).json({ data: mark });
      } catch (error) {
        return next(error);
      }
    },

    async updateMark(request, response, next) {
      try {
        const mark = await students.updateMark(request.params.id, request.params.markId, request.validated.body);
        if (!mark) return response.status(404).json({ error: 'Student or mark not found.' });
        return response.json({ data: mark });
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