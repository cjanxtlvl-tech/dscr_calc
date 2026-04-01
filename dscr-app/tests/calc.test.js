const test = require("node:test");
const assert = require("node:assert/strict");

const { calculateDscr, toPositiveNumber } = require("../frontend/calc");

test("toPositiveNumber handles invalid and negative values", () => {
  assert.equal(toPositiveNumber("abc"), 0);
  assert.equal(toPositiveNumber(-12), 0);
  assert.equal(toPositiveNumber("1450.5"), 1450.5);
});

test("calculateDscr returns strong band when dscr >= 1.25", () => {
  const result = calculateDscr({
    rentalIncome: 3000,
    principalInterest: 1500,
    propertyTaxes: 400,
    insurance: 100,
    hoa: 0,
    otherExpenses: 0
  });

  assert.equal(result.debtService, 2000);
  assert.equal(result.dscr, 1.5);
  assert.equal(result.band, "strong");
  assert.equal(result.message, null);
});

test("calculateDscr handles divide-by-zero safely", () => {
  const result = calculateDscr({
    rentalIncome: 2500,
    principalInterest: 0,
    propertyTaxes: 0,
    insurance: 0,
    hoa: 0,
    otherExpenses: 0
  });

  assert.equal(result.dscr, null);
  assert.equal(result.band, "weak");
  assert.match(result.message, /greater than \$0/i);
});
