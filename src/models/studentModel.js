const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true, maxlength: 255 },
  lastName: { type: String, required: true, trim: true, maxlength: 255 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  dateOfBirth: { type: String, default: null },
  grade: { type: String, default: null, maxlength: 255 },
  attendance: [{
    date: { type: String, required: true },
    status: { type: String, enum: ['present', 'absent', 'late', 'excused'], required: true }
  }],
  marks: [{
    subject: { type: String, required: true, trim: true, maxlength: 255 },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 0.01, default: 100 },
    date: { type: String, required: true }
  }]
}, { timestamps: true, versionKey: false });

studentSchema.path('marks').validate((marks) =>
  marks.every((mark) => mark.score <= mark.maxScore),
  'A mark score cannot exceed its maximum score.'
);

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

function toStudent(document) {
  if (!document) return null;
  const student = typeof document.toObject === 'function' ? document.toObject() : document;
  return {
    id: String(student._id),
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    dateOfBirth: student.dateOfBirth ?? null,
    grade: student.grade ?? null,
    attendance: (student.attendance ?? []).map(({ date, status }) => ({ date, status })),
    marks: (student.marks ?? []).map((mark) => ({
      id: String(mark._id),
      subject: mark.subject,
      score: mark.score,
      maxScore: mark.maxScore,
      date: mark.date
    })),
    createdAt: new Date(student.createdAt).toISOString(),
    updatedAt: new Date(student.updatedAt).toISOString()
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalize(input) {
  return Object.fromEntries(Object.entries(input).map(([field, value]) => {
    if (typeof value !== 'string') return [field, value];
    const trimmedValue = value.trim();
    if ((field === 'dateOfBirth' || field === 'grade') && !trimmedValue) {
      return [field, null];
    }
    return [field, trimmedValue];
  }));
}

function createStudentModel(model = Student) {
  return {
    async list({ search, grade, page, limit }) {
      const filter = {};
      if (search) {
        const pattern = new RegExp(escapeRegex(search), 'i');
        filter.$or = [{ firstName: pattern }, { lastName: pattern }, { email: pattern }];
      }
      if (grade) filter.grade = grade;

      const [documents, total] = await Promise.all([
        model.find(filter).sort({ lastName: 1, firstName: 1 }).skip((page - 1) * limit).limit(limit).exec(),
        model.countDocuments(filter).exec()
      ]);
      return {
        data: documents.map(toStudent),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    },

    async findById(id) {
      return toStudent(await model.findById(id).exec());
    },

    async create(input) {
      return toStudent(await model.create(normalize(input)));
    },

    async update(id, input) {
      const document = await model.findByIdAndUpdate(id, normalize(input), {
        new: true,
        runValidators: true
      }).exec();
      return toStudent(document);
    },

    async getAttendance(id) {
      const document = await model.findById(id).exec();
      return document ? (document.attendance ?? []).map(({ date, status }) => ({ date, status })) : null;
    },

    async setAttendance(id, date, status) {
      const document = await model.findById(id).exec();
      if (!document) return null;
      const record = document.attendance.find((entry) => entry.date === date);
      if (record) record.status = status;
      else document.attendance.push({ date, status });
      await document.save();
      return { date, status };
    },

    async getMarks(id) {
      const document = await model.findById(id).exec();
      return document ? (document.marks ?? []).map((mark) => ({
        id: String(mark._id),
        subject: mark.subject,
        score: mark.score,
        maxScore: mark.maxScore,
        date: mark.date
      })) : null;
    },

    async addMark(id, input) {
      const document = await model.findById(id).exec();
      if (!document) return null;
      document.marks.push(input);
      await document.save();
      const mark = document.marks.at(-1);
      return {
        id: String(mark._id),
        subject: mark.subject,
        score: mark.score,
        maxScore: mark.maxScore,
        date: mark.date
      };
    },

    async updateMark(id, markId, input) {
      const document = await model.findById(id).exec();
      if (!document) return null;
      const mark = document.marks.id(markId);
      if (!mark) return null;
      Object.assign(mark, input);
      await document.save();
      return {
        id: String(mark._id),
        subject: mark.subject,
        score: mark.score,
        maxScore: mark.maxScore,
        date: mark.date
      };
    },

    async dashboard() {
      const [totalStudents, attendanceByStatus, markSummary] = await Promise.all([
        model.countDocuments().exec(),
        model.aggregate([
          { $unwind: '$attendance' },
          { $group: { _id: '$attendance.status', count: { $sum: 1 } } }
        ]).exec(),
        model.aggregate([
          { $unwind: '$marks' },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              averagePercentage: {
                $avg: { $multiply: [{ $divide: ['$marks.score', '$marks.maxScore'] }, 100] }
              }
            }
          }
        ]).exec()
      ]);
      const attendance = Object.fromEntries(
        ['present', 'absent', 'late', 'excused'].map((status) => [status, 0])
      );
      for (const item of attendanceByStatus) attendance[item._id] = item.count;
      return {
        totalStudents,
        attendance,
        marks: {
          count: markSummary[0]?.count ?? 0,
          averagePercentage: markSummary[0]?.averagePercentage ?? null
        }
      };
    },

    async delete(id) {
      return Boolean(await model.findByIdAndDelete(id).exec());
    }
  };
}

module.exports = { Student, createStudentModel };