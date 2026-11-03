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
npm run build
```
