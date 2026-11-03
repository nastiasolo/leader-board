const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/health', (_, response) => {
  response.json({ ok: true });
});

module.exports = app;
