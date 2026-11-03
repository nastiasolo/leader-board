const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const salesRoutes = require('./routes/sales');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_, response) => {
  response.json({ ok: true });
});

module.exports = app;
