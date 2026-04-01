(function (globalScope) {
  function toPositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  function calculateDscr(inputs) {
    const debtService =
      toPositiveNumber(inputs.principalInterest) +
      toPositiveNumber(inputs.propertyTaxes) +
      toPositiveNumber(inputs.insurance) +
      toPositiveNumber(inputs.hoa) +
      toPositiveNumber(inputs.otherExpenses);

    if (debtService <= 0) {
      return {
        debtService,
        dscr: null,
        band: "weak",
        message: "Debt service must be greater than $0 to calculate DSCR."
      };
    }

    const rentalIncome = toPositiveNumber(inputs.rentalIncome);
    const dscr = rentalIncome / debtService;

    let band = "weak";
    if (dscr >= 1.25) {
      band = "strong";
    } else if (dscr >= 1.0) {
      band = "borderline";
    }

    return {
      debtService,
      dscr,
      band,
      message: null
    };
  }

  const api = {
    toPositiveNumber,
    calculateDscr
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.DSCRCalculator = api;
})(typeof window !== "undefined" ? window : globalThis);
