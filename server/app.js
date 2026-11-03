const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/health', (_, response) => {
  response.json({ ok: true });
});

module.exports = app;
