const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const salesRoutes = require('./routes/sales');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);

app.get('/health', (_, response) => {
  response.json({ ok: true });
});

module.exports = app;
