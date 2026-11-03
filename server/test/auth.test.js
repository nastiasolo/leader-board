const assert = require('node:assert/strict');
const { test } = require('node:test');
const app = require('../app');

// Describe: login request validation
test(
  'Given no credentials, When logging in, Then 400 is returned',
  async () => {
    // Given: the API is listening on an available local port
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();

    try {
      // When: a client sends an empty login request
      const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      // Then: the API reports that credentials are required
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Email and password are required',
      });
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  },
);
