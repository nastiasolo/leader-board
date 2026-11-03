const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireAdmin } = require('../middleware/auth');

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

// Describe: admin authorization
test('Given an employee, When requiring admin, Then access is denied', () => {
  // Given: an authenticated employee request
  const request = { user: { is_admin: false } };
  const response = createResponse();
  let nextCalled = false;

  // When: the admin authorization middleware runs
  requireAdmin(request, response, () => {
    nextCalled = true;
  });

  // Then: the middleware returns 403 without calling the next handler
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { error: 'Admin access required' });
  assert.equal(nextCalled, false);
});

test('Given an admin, When requiring admin, Then the next handler runs', () => {
  // Given: an authenticated admin request
  const request = { user: { is_admin: true } };
  const response = createResponse();
  let nextCalled = false;

  // When: the admin authorization middleware runs
  requireAdmin(request, response, () => {
    nextCalled = true;
  });

  // Then: the request continues to the protected handler
  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, null);
});
