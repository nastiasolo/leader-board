function parseSaleAmounts(body = {}) {
  const values = body && typeof body === 'object' ? body : {};

  function parseAmount(value) {
    if (value === undefined || value === null || value === '') {
      return 0;
    }
    if (typeof value !== 'number' && typeof value !== 'string') {
      return Number.NaN;
    }

    return Number(value);
  }

  return {
    amount: parseAmount(values.amount),
    commission: parseAmount(values.commission),
  };
}

function validateSaleAmounts(amount, commission) {
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(commission) ||
    amount < 0 ||
    commission < 0
  ) {
    return 'Amount and commission must be valid non-negative numbers';
  }

  if (amount === 0 && commission === 0) {
    return 'At least one of amount or commission must be greater than zero';
  }

  return null;
}

function validateSaleDate(date) {
  if (!date) {
    return 'Date is required';
  }

  if (typeof date !== 'string') {
    return 'Invalid amount or date format';
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return 'Invalid amount or date format';
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(0);
  parsedDate.setUTCFullYear(year, month - 1, day);
  parsedDate.setUTCHours(0, 0, 0, 0);

  if (
    year === 0 ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return 'Invalid amount or date format';
  }

  return null;
}

module.exports = {
  parseSaleAmounts,
  validateSaleAmounts,
  validateSaleDate,
};
