const assert = require('node:assert/strict');
const test = require('node:test');
const app = require('../app');

// Describe: API health endpoint
test('GET /health returns a successful status and ok response', async () => {
  // Given: the API is listening on an available local port
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  try {
    // When: a client requests the health endpoint
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    // Then: the API reports that it is healthy
    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
