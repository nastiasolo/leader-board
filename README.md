# Sales Leaderboard

A full-stack demo app for employees to record sales and commissions, view a
leaderboard, and let admins manage the team.

## Stack

- Frontend: React 18, Vite, React Router
- Backend: Node.js and Express
- Database: PostgreSQL
- Authentication: JWT bearer tokens

## Project structure

```text
client/     React application
server/     Express API
database/   PostgreSQL schema and demo data scripts
```

## Database setup

Install PostgreSQL and create a database for the demo:

```bash
createdb sales_leaderboard_demo
cp server/.env.example server/.env
```

Check that `DATABASE_URL` in `server/.env` points to this database, then create
the tables and insert fictional employees and sales:

```bash
npm run db:schema
npm run db:reset-demo
```

`db:reset-demo` replaces all employees and sales in the configured database
with the demo dataset. It is a manual command and is never run when the server
starts. Visitor changes remain in PostgreSQL until you run the reset command.

Demo logins for the app:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@demo.com` | `DemoPass123!` |
| Employee | `alex@demo.com` | `DemoPass123!` |

The seed script stores password hashes, not plaintext passwords.

## Authentication API

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Validate credentials and return a JWT |
| GET | `/api/auth/me` | Bearer token | Return the current employee profile |
| POST | `/api/auth/register` | Disabled | Return 403; admins create accounts |

## Development

Install dependencies in both applications:

```bash
npm install --prefix client
npm install --prefix server
```

Run the frontend and backend in separate terminals:

```bash
npm run dev:client
npm run dev:server
```

The frontend runs at `http://localhost:3000`; the API runs at
`http://localhost:3001`.

## Verification

```bash
npm run test:server
npm run test:server:auth
npm run build
```

Database integration tests use a separate PostgreSQL database:

```bash
createdb sales_leaderboard_test
TEST_DATABASE_URL=postgresql://localhost:5432/sales_leaderboard_test \
  npm run test:server:db
TEST_DATABASE_URL=postgresql://localhost:5432/sales_leaderboard_test \
  npm run test:auth:db
```
