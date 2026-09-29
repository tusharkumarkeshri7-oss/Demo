# Student Management API

A REST API built with JavaScript, Express, Mongoose, and MongoDB.

## Requirements

- Node.js 22 or newer
- npm
- MongoDB running locally, or a MongoDB Atlas connection string

## Run

```sh
npm install
npm run dev
```

The API listens at `http://localhost:3000` and connects to `mongodb://127.0.0.1:27017/student_management` by default. Set `MONGODB_URI` to use another MongoDB connection string and `PORT` to change the API port.

## Project structure

- `src/config/` contains database configuration.
- `src/routes/` maps HTTP routes to controllers.
- `src/controllers/` handles request and response logic.
- `src/models/` contains student database queries and mapping.
- `src/middleware/` contains request validation and error handling.
- `src/app.js` configures the Express application; `src/server.js` starts it.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| GET | `/api/students` | List students; accepts `search`, `grade`, `page`, and `limit` query parameters |
| GET | `/api/students/:id` | Get a student |
| POST | `/api/students` | Create a student |
| PATCH | `/api/students/:id` | Update supplied student fields |
| DELETE | `/api/students/:id` | Delete a student |

Create request example:

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "dateOfBirth": "1815-12-10",
  "grade": "12"
}
```

`firstName`, `lastName`, and `email` are required. `dateOfBirth` and `grade` are optional. Emails are unique and stored lowercase. List responses include `data` and pagination metadata.

## Test

```sh
npm test
```