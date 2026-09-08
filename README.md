# TaskFlow AI

TaskFlow AI is a full-stack productivity workspace for turning broad goals into organized tasks and projects. It combines secure cookie-based authentication, Neon PostgreSQL persistence, project-aware task management, analytics, and an optional AI assistant.

## Features

- User registration, login, logout, and session restoration
- HTTP-only JWT cookies with bcrypt password hashing
- User-owned tasks and projects with ownership enforcement
- Task priorities, statuses, descriptions, due dates, search, filters, and sorting
- Project progress and task counts
- Dashboard analytics and completion progress
- Profile and password management
- AI task breakdown, task improvement, priority suggestions, and productivity insights
- Graceful AI unavailable, timeout, invalid response, and rate-limit states

## Stack

- React, Vite, React Router, CSS
- Node.js, Express
- Neon PostgreSQL with `@neondatabase/serverless`
- bcrypt and JSON Web Tokens
- OpenAI-compatible AI providers, including Gemini

## Architecture

```text
client/src/
  components/   shared layout, task board, analytics
  context/      authentication state
  lib/          API client
  pages/        dashboard, tasks, projects, profile, AI assistant

server/src/
  config/       Neon database client
  controllers/  request handlers
  middleware/   JWT authentication
  routes/       Express route modules
  services/     AI provider integration
  sql/          numbered idempotent migrations
```

## Setup

Install dependencies:

```bash
cd server && npm install
cd ../client && npm install
```

Create `server/.env` from `server/.env.example` and provide the Neon connection string, JWT secret, and optional AI provider settings. Keep secrets server-side and never commit `.env`.

Run migrations:

```bash
cd server
npm run db:migrate
```

Start the backend:

```bash
npm start
```

Start the frontend in another terminal:

```bash
npm run --prefix client dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173.

## Environment Variables

Required backend variables:

```env
PORT=5050
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Optional AI variables:

```env
AI_PROVIDER=openai-compatible
AI_API_KEY=provider-key
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL=gemini-3.8-flash
```

The AI key is used only by the backend. If it is absent or the provider is unavailable, the application shows a safe retryable state.

## API Overview

Authentication:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
```

Tasks:

```text
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
GET    /api/tasks/stats
```

Projects:

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

AI:

```text
POST /api/ai/task-breakdown
POST /api/ai/improve-task
POST /api/ai/suggest-priority
GET  /api/ai/insights
```

## Verification

Backend tests:

```bash
cd server
npm test
```

Frontend checks:

```bash
cd client
npm run lint
npm run build
```

## Portfolio Notes

TaskFlow AI demonstrates authenticated multi-user CRUD, relational PostgreSQL modeling, protected AI context, structured provider output validation, and responsive productivity workflows. Future enhancements could include a migration ledger, richer activity history, scheduled notifications, and additional provider adapters.
