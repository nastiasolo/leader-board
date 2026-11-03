# Sales Leaderboard Architecture

## Project structure

```text
client/
  public/avatars/ Fictional employee profile images
  src/
    api/          Fetch helpers for the Express API
    components/   Shared layout and sale form
    context/      Authentication state
    pages/        Login, Dashboard, Leaderboard, AdminPanel
server/
  config/         PostgreSQL connection pool
  lib/            Sale validation and fictional seed data
  middleware/     JWT authentication and admin authorization
  routes/         Authentication, sales, leaderboard, and admin APIs
  scripts/        Schema and demo-data commands
  test/           Unit and PostgreSQL integration tests
database/
  schema.sql      PostgreSQL tables and indexes
```

The React client calls the Express API through `client/src/api`. The API uses
the PostgreSQL connection pool in `server/config/db.js`. The schema and demo
seed are run manually; starting the server does not reset application data.

The client uses React 18, React Router, and Vite. The server uses Express and
the `pg` PostgreSQL client. Authentication uses JWT and bcrypt.

## Client routes

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login | Signed out |
| `/dashboard` | Personal sales and sale form | Signed in |
| `/leaderboard` | Period rankings | Signed in |
| `/admin` | Employee and all-sales management | Admin |

The shared layout provides navigation and the signed-in employee controls.
`AuthContext` restores the current profile from `/api/auth/me` when the app
loads and exposes login state to protected routes.

## Data model

### `employees`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | serial primary key | Employee identifier |
| `email` | varchar, unique | Login email |
| `password_hash` | varchar | bcrypt password hash |
| `name` | varchar | Display name |
| `photo_url` | text, nullable | Optional profile image |
| `is_admin` | boolean | Grants access to admin routes and page |
| `created_at` | timestamptz | Account creation time |

### `sales`

| Column | Type | Purpose |
|--------|------|---------|
| `id` | serial primary key | Sale identifier |
| `employee_id` | integer, foreign key | Owner; deleting an employee cascades to their sales |
| `amount` | numeric(12, 2), non-negative | Sale value in DKK |
| `commission` | numeric(12, 2), non-negative | Commission in DKK |
| `date` | date | Date attributed to the sale |
| `created_at` | timestamptz | Record creation time |

Indexes support lookups by employee, date, and employee/date. A sale must
have a positive amount or commission. The leaderboard ranks by `amount` only;
commission does not affect the ranking.

## Authentication and access

`POST /api/auth/login` checks the email and password hash, then returns a
seven-day JWT and the employee profile. The client stores the token in
`localStorage` and sends it as `Authorization: Bearer <token>`. The API
middleware verifies the token and makes the employee ID and admin role
available to route handlers. Admin routes also require `is_admin`.

Self-registration is disabled. Admins create employee accounts through the
admin API. Employees can access their own sales; admins can manage any sale.
An admin cannot delete their own account.

## API

Endpoints require a bearer token except public login, disabled registration,
and the health check. Endpoints under `/api/admin` require an admin account.

| Method | Endpoint | Access | Behavior |
|--------|----------|--------|----------|
| POST | `/api/auth/login` | Public | Sign in; returns `{ user, token }` |
| POST | `/api/auth/register` | Public, disabled | Returns 403; accounts are admin-created |
| GET | `/api/auth/me` | Signed in | Return the current employee profile |
| GET | `/health` | Public | Confirm that the API is responding |
| GET | `/api/sales` | Signed in | List the current employee's sales |
| POST | `/api/sales` | Signed in | Create a sale with `amount`, `commission`, and `date` |
| PUT | `/api/sales/:id` | Owner or admin | Update a sale |
| DELETE | `/api/sales/:id` | Owner or admin | Delete a sale |
| GET | `/api/leaderboard?period=week\|month\|year` | Signed in | Rank employees by sales amount in the period |
| GET | `/api/admin/users` | Admin | List employee profiles |
| POST | `/api/admin/users` | Admin | Create an employee with name, email, password, and optional photo/admin role |
| DELETE | `/api/admin/users/:id` | Admin | Delete an employee and their sales; self-deletion is rejected |
| GET | `/api/admin/sales` | Admin | List sales with employee identity and commission |

The leaderboard defaults to the current month and returns the selected period,
date range, and a `leaderboard` array. Each entry contains `rank`,
`employee_id`, `name`, `photo_url`, and `total_sales`. Only employees with
sales in the selected period appear. Period boundaries use the PostgreSQL
server's `CURRENT_DATE`.

## Demo data and local commands

Fictional accounts and sales are in `server/lib/demoSeed.js`. See the root
[README](README.md) for database setup, demo credentials, development
commands, and verification commands. `npm run db:reset-demo` replaces the
employees and sales in the configured database when run manually.
