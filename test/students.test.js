const assert = require('node:assert/strict');
const { afterEach, beforeEach, test } = require('node:test');
const request = require('supertest');
const { createApp } = require('../src/app');
const { Student } = require('../src/models/studentModel');

let app;
let records;
let nextId;

beforeEach(() => {
  records = new Map();
  nextId = 1;
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
  const student = { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' };
  await request(app).post('/api/students').send(student).expect(201);
  await request(app).post('/api/students').send({ ...student, email: 'ADA@example.com' }).expect(409);
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