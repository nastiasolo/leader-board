const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  parseSaleAmounts,
  validateSaleAmounts,
  validateSaleDate,
} = require('../lib/saleValidation');

// Describe: sale input validation
test('Given numeric strings, When parsed, Then amounts are numbers', () => {
  // Given: a sale form sends numeric strings
  const body = { amount: '1250.50', commission: '125.25' };

  // When: the sale amounts are parsed
  const values = parseSaleAmounts(body);

  // Then: the API can pass numeric values to PostgreSQL
  assert.deepEqual(values, { amount: 1250.5, commission: 125.25 });
});

test('Given missing amount, When parsed, Then it defaults to zero', () => {
  // Given: the sale contains commission only
  const body = { commission: '45.00' };

  // When: the sale amounts are parsed
  const values = parseSaleAmounts(body);

  // Then: the missing amount is zero
  assert.deepEqual(values, { amount: 0, commission: 45 });
});

test('Given invalid values, When checked, Then amounts are rejected', () => {
  // Given: sale values that cannot be stored as valid DKK amounts
  const invalidValues = [
    [-1, 0],
    [0, -1],
    [Number.NaN, 10],
    [10, Number.POSITIVE_INFINITY],
  ];

  // When: each pair is checked
  const errors = invalidValues.map(([amount, commission]) =>
    validateSaleAmounts(amount, commission),
  );

  // Then: every pair returns a validation error
  assert.equal(errors.every(Boolean), true);
});

test('Given zeros, When checked, Then a positive value is required', () => {
  // Given: an empty sale

  // When: the amounts are validated
  const error = validateSaleAmounts(0, 0);

  // Then: at least one amount must be positive
  assert.equal(
    error,
    'At least one of amount or commission must be greater than zero',
  );
});

test('Given an ISO date, When checked, Then it is accepted', () => {
  // Given: a calendar-valid date in YYYY-MM-DD format
  const date = '2026-11-03';

  // When: the date is validated
  const error = validateSaleDate(date);

  // Then: the date is accepted
  assert.equal(error, null);
});

test('Given an invalid date, When checked, Then it is rejected', () => {
  // Given: missing, malformed, and impossible dates
  const invalidDates = [undefined, '03-11-2026', '2026-02-30'];

  // When: each date is validated
  const errors = invalidDates.map(validateSaleDate);

  // Then: every date returns a validation error
  assert.equal(errors.every(Boolean), true);
});
