const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const request = require('supertest');
const { createApp } = require('../src/app');
const { Student } = require('../src/models/studentModel');

let app;
let records;
let nextId;
let nextMarkId;

beforeEach(() => {
  records = new Map();
  nextId = 1;
  nextMarkId = 1;
  const repository = {
    async list({ search, grade, page, limit }) {
      let students = [...records.values()];
      if (search) {
        const normalizedSearch = search.toLowerCase();
        students = students.filter((student) =>
          [student.firstName, student.lastName, student.email]
            .some((value) => value.toLowerCase().includes(normalizedSearch))
        );
      }
      if (grade) students = students.filter((student) => student.grade === grade);
      students.sort((left, right) => left.lastName.localeCompare(right.lastName));
      const total = students.length;
      return {
        data: students.slice((page - 1) * limit, page * limit),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      };
    },
    async findById(id) {
      return records.get(String(id)) || null;
    },
    async create(input) {
      if ([...records.values()].some((student) => student.email === input.email.toLowerCase())) {
        throw { code: 11000 };
      }
      const now = new Date().toISOString();
      const student = {
        id: String(nextId++),
        ...input,
        email: input.email.trim().toLowerCase(),
        dateOfBirth: input.dateOfBirth?.trim() || null,
        grade: input.grade?.trim() || null,
        attendance: [],
        marks: [],
        createdAt: now,
        updatedAt: now
      };
      records.set(student.id, student);
      return student;
    },
    async update(id, input) {
      const student = records.get(String(id));
      if (!student) return null;
      const updates = { ...input };
      for (const field of ['dateOfBirth', 'grade']) {
        if (updates[field] !== undefined) updates[field] = updates[field]?.trim() || null;
      }
      Object.assign(student, updates, { updatedAt: new Date().toISOString() });
      return student;
    },
    async getAttendance(id) {
      const student = records.get(String(id));
      return student ? student.attendance : null;
    },
    async setAttendance(id, date, status) {
      const student = records.get(String(id));
      if (!student) return null;
      const record = student.attendance.find((entry) => entry.date === date);
      if (record) record.status = status;
      else student.attendance.push({ date, status });
      return { date, status };
    },
    async getMarks(id) {
      const student = records.get(String(id));
      return student ? student.marks : null;
    },
    async addMark(id, input) {
      const student = records.get(String(id));
      if (!student) return null;
      const mark = { id: String(nextMarkId++), ...input };
      student.marks.push(mark);
      return mark;
    },
    async updateMark(id, markId, input) {
      const student = records.get(String(id));
      const mark = student?.marks.find((entry) => entry.id === markId);
      if (!mark) return null;
      Object.assign(mark, input);
      return mark;
    },
    async dashboard() {
      const students = [...records.values()];
      const attendance = { present: 0, absent: 0, late: 0, excused: 0 };
      const marks = students.flatMap((student) => student.marks);
      for (const student of students) {
        for (const record of student.attendance) attendance[record.status] += 1;
      }
      return {
        totalStudents: students.length,
        attendance,
        marks: {
          count: marks.length,
          averagePercentage: marks.length
            ? marks.reduce((total, mark) => total + (mark.score / mark.maxScore) * 100, 0) / marks.length
            : null
        }
      };
    },
    async delete(id) {
      return records.delete(String(id));
    }
  };
  app = createApp(repository);
});

afterEach(() => records.clear());

test('creates, reads, updates, and deletes a student', async () => {
  const created = await request(app).post('/api/students').send({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    dateOfBirth: '1815-12-10',
    grade: '12'
  }).expect(201);
  const id = created.body.data.id;

  assert.equal(created.body.data.email, 'ada@example.com');
  await request(app).get(`/api/students/${id}`).expect(200);
  const updated = await request(app).patch(`/api/students/${id}`).send({ grade: 'College' }).expect(200);
  assert.equal(updated.body.data.grade, 'College');
  const cleared = await request(app).patch(`/api/students/${id}`).send({ grade: '' }).expect(200);
  assert.equal(cleared.body.data.grade, null);
  await request(app).patch(`/api/students/${id}`).send({ firstName: ' ' }).expect(400);
  await request(app).delete(`/api/students/${id}`).expect(204);
  await request(app).get(`/api/students/${id}`).expect(404);
});

test('validates input and rejects duplicate email addresses', async () => {
  await request(app).post('/api/students').send({ firstName: 'Ada' }).expect(400);
  await request(app).post('/api/students').send({
    firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', extra: 'unexpected'
  }).expect(400);
  const student = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };
  await request(app).post('/api/students').send(student).expect(201);
  await request(app).post('/api/students').send({ ...student, email: 'ADA@example.com' }).expect(409);
  await request(app).patch('/api/students/1').send({}).expect(400);
});

test('filters and paginates student results', async () => {
  const records = [
    { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', grade: '12' },
    { firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', grade: '12' },
    { firstName: 'Katherine', lastName: 'Johnson', email: 'kat@example.com', grade: '11' }
  ];
  for (const record of records) await request(app).post('/api/students').send(record).expect(201);

  const response = await request(app).get('/api/students?grade=12&page=1&limit=1').expect(200);
  assert.equal(response.body.pagination.total, 2);
  assert.equal(response.body.data.length, 1);
  const search = await request(app).get('/api/students?search=Katherine').expect(200);
  assert.equal(search.body.data[0].email, 'kat@example.com');
});

test('provides a health check', async () => {
  const response = await request(app).get('/health').expect(200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('Mongoose student schema normalizes email and validates required fields', async () => {
  const student = new Student({
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ADA@EXAMPLE.COM'
  });
  await student.validate();
  assert.equal(student.email, 'ada@example.com');

  const invalidStudent = new Student({ email: 'not-an-email' });
  await assert.rejects(invalidStudent.validate(), { name: 'ValidationError' });
});

test('updates profiles, records attendance and marks, and summarizes the dashboard', async () => {
  const created = await request(app).post('/api/students').send({
    firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com'
  }).expect(201);
  const id = created.body.data.id;

  await request(app).patch(`/api/students/${id}/profile`).send({ grade: '12' }).expect(200);
  await request(app).put(`/api/students/${id}/attendance/2026-09-30`).send({ status: 'absent' }).expect(200);
  const updatedAttendance = await request(app)
    .put(`/api/students/${id}/attendance/2026-09-30`).send({ status: 'present' }).expect(200);
  assert.deepEqual(updatedAttendance.body.data, { date: '2026-09-30', status: 'present' });
  const attendance = await request(app).get(`/api/students/${id}/attendance`).expect(200);
  assert.equal(attendance.body.data.length, 1);

  const createdMark = await request(app).post(`/api/students/${id}/marks`).send({
    subject: 'Mathematics', score: 8, maxScore: 10, date: '2026-09-30'
  }).expect(201);
  const markId = createdMark.body.data.id;
  await request(app).patch(`/api/students/${id}/marks/${markId}`).send({ score: 9 }).expect(200);
  const marks = await request(app).get(`/api/students/${id}/marks`).expect(200);
  assert.equal(marks.body.data[0].score, 9);

  const dashboard = await request(app).get('/api/students/dashboard').expect(200);
  assert.equal(dashboard.body.data.totalStudents, 1);
  assert.equal(dashboard.body.data.attendance.present, 1);
  assert.equal(dashboard.body.data.marks.averagePercentage, 90);
  const defaultedMark = await request(app).post(`/api/students/${id}/marks`).send({
    subject: 'History', score: 7
  }).expect(201);
  assert.equal(defaultedMark.body.data.maxScore, 100);
  assert.match(defaultedMark.body.data.date, /^\d{4}-\d{2}-\d{2}$/);
  await request(app).put(`/api/students/${id}/attendance/2026-02-30`).send({ status: 'present' }).expect(400);
  await request(app).post(`/api/students/${id}/marks`).send({ subject: 'Science', score: 11, maxScore: 10 }).expect(400);
});