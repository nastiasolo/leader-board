# Sales Leaderboard

A full-stack demo app for employees to record sales and commissions, compare
results on a leaderboard, and let admins manage employees and sales. It uses
fictional data and DKK throughout.

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

## Run the app

You need Node.js, npm, and PostgreSQL. Create a local database and configure
the API environment:

```bash
createdb sales_leaderboard_demo
cp server/.env.example server/.env
```

Check that `DATABASE_URL` in `server/.env` points to this database. Then
install the client and server dependencies, create the schema, and load the
fictional demo data:

```bash
npm install --prefix client
npm install --prefix server
npm run db:schema
npm run db:reset-demo
```

`db:reset-demo` replaces all employees and sales in the configured database.
Run it manually when you want to restore the sample data; the server never
runs it on startup. App changes are stored in PostgreSQL until you reset.

Start the client and API in separate terminals:

```bash
npm run dev:client
npm run dev:server
```

Open `http://localhost:3000`. The API runs at `http://localhost:3001`.

## Demo accounts

All accounts use the password `DemoPass123!`.

| Role | Email |
|------|-------|
| Admin | `admin@demo.com` |
| Employee | `alex@demo.com` |
| Employee | `jordan@demo.com` |
| Employee | `taylor@demo.com` |

The seed script stores password hashes, not plaintext passwords.

## Features

- Employees can sign in, record sales and commissions, and edit or delete
  their own entries.
- The leaderboard ranks sales for the current week, month, or year.
- Admins can create and remove employee accounts and manage all sales.
- Sales and commissions are displayed in DKK.

## API

All endpoints except login require a bearer token, except where access is
listed as admin.

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Validate credentials and return a JWT |
| GET | `/api/auth/me` | Signed in | Return the current employee profile |
| POST | `/api/auth/register` | Disabled | Return 403; admins create accounts |
| GET | `/api/sales` | Signed in | List the current employee's sales |
| POST | `/api/sales` | Signed in | Create a sale and commission |
| PUT | `/api/sales/:id` | Owner or admin | Update a sale |
| DELETE | `/api/sales/:id` | Owner or admin | Delete a sale |
| GET | `/api/leaderboard` | Signed in | Rank sales by week, month, or year |
| GET | `/api/admin/users` | Admin | List employees |
| POST | `/api/admin/users` | Admin | Create an employee account |
| DELETE | `/api/admin/users/:id` | Admin | Delete an employee account |
| GET | `/api/admin/sales` | Admin | List all sales |

## Verification

Run the client and server checks from the project root:

```bash
npm run test:client
npm run test:server
npm run test:server:auth
npm run test:server:sales
npm run build
```

Database integration tests use a separate PostgreSQL database because they
create tables and modify test data. Configure `TEST_DATABASE_URL` to point to
a disposable database before running them:

```bash
createdb sales_leaderboard_test
TEST_DATABASE_URL=postgresql://localhost:5432/sales_leaderboard_test npm run test:server:db
TEST_DATABASE_URL=postgresql://localhost:5432/sales_leaderboard_test npm run test:auth:db
TEST_DATABASE_URL=postgresql://localhost:5432/sales_leaderboard_test npm run test:sales:db
TEST_DATABASE_URL=postgresql://localhost:5432/sales_leaderboard_test npm run test:leaderboard
TEST_DATABASE_URL=postgresql://localhost:5432/sales_leaderboard_test npm run test:admin:db
```

Database connection settings are in `server/.env`; the schema is in
`database/schema.sql`.
