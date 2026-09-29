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
  grade: { type: String, default: null, maxlength: 255 }
}, { timestamps: true, versionKey: false });

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

    async delete(id) {
      return Boolean(await model.findByIdAndDelete(id).exec());
    }
  };
}

module.exports = { Student, createStudentModel };