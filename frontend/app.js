const calculatorForm = document.getElementById("calculator-form");
const leadForm = document.getElementById("lead-form");
const calculatorResult = document.getElementById("calculator-result");
const leadStatus = document.getElementById("lead-status");
const submittedAtInput = document.getElementById("submittedAt");
const panelDscr = document.getElementById("panel-dscr");
const panelDebt = document.getElementById("panel-debt");
const panelRent = document.getElementById("panel-rent");
const panelBand = document.getElementById("panel-band");
const donutPi = document.getElementById("donut-pi");
const donutTax = document.getElementById("donut-tax");
const donutIns = document.getElementById("donut-ins");
const legendPi = document.getElementById("legend-pi");
const legendTax = document.getElementById("legend-tax");
const legendIns = document.getElementById("legend-ins");

function setSubmissionTimestamp() {
  if (submittedAtInput) {
    submittedAtInput.value = String(Date.now());
  }
}

setSubmissionTimestamp();

const analyticsState = {
  calculatorStarted: false
};

const calculatorCore = window.DSCRCalculator || {
  toPositiveNumber: (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  },
  calculateDscr: () => ({
    debtService: 0,
    dscr: null,
    band: "weak",
    message: "Calculator core unavailable."
  })
};

window.dataLayer = window.dataLayer || [];

function pushEvent(eventName, payload = {}) {
  window.dataLayer.push({
    event: eventName,
    ...payload
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function bandCopy(band) {
  if (band === "strong") {
    return "Strong";
  }
  if (band === "borderline") {
    return "Borderline";
  }
  return "Weak";
}

function updateDonutBreakdown(components, totalDebt) {
  const circumference = 2 * Math.PI * 54;
  const safeTotal = totalDebt > 0 ? totalDebt : 1;

  const piRatio = components.principalInterest / safeTotal;
  const taxRatio = components.propertyTaxes / safeTotal;
  const insRatio = components.insuranceHoaOther / safeTotal;

  const piLen = Math.max(0, piRatio * circumference);
  const taxLen = Math.max(0, taxRatio * circumference);
  const insLen = Math.max(0, insRatio * circumference);

  donutPi.style.strokeDasharray = `${piLen} ${circumference - piLen}`;
  donutPi.style.strokeDashoffset = "0";

  donutTax.style.strokeDasharray = `${taxLen} ${circumference - taxLen}`;
  donutTax.style.strokeDashoffset = `${-piLen}`;

  donutIns.style.strokeDasharray = `${insLen} ${circumference - insLen}`;
  donutIns.style.strokeDashoffset = `${-(piLen + taxLen)}`;

  const piPct = totalDebt > 0 ? (piRatio * 100).toFixed(1) : "0.0";
  const taxPct = totalDebt > 0 ? (taxRatio * 100).toFixed(1) : "0.0";
  const insPct = totalDebt > 0 ? (insRatio * 100).toFixed(1) : "0.0";

  legendPi.textContent = `${formatMoney(components.principalInterest)} · ${piPct}%`;
  legendTax.textContent = `${formatMoney(components.propertyTaxes)} · ${taxPct}%`;
  legendIns.textContent = `${formatMoney(components.insuranceHoaOther)} · ${insPct}%`;
}

function onCalculatorStart() {
  if (!analyticsState.calculatorStarted) {
    analyticsState.calculatorStarted = true;
    pushEvent("calculator_start");
  }
}

calculatorForm.addEventListener("focusin", onCalculatorStart, { once: false });

function renderCalculator(values, result) {
  const components = {
    principalInterest: values.principalInterest,
    propertyTaxes: values.propertyTaxes,
    insuranceHoaOther: values.insurance + values.hoa + values.otherExpenses
  };

  panelDebt.textContent = formatMoney(result.debtService);
  panelRent.textContent = formatMoney(values.rentalIncome);
  updateDonutBreakdown(components, result.debtService);

  if (result.message) {
    panelDscr.textContent = "0.00";
    panelBand.textContent = "Weak";
    calculatorResult.classList.remove("hidden");
    calculatorResult.innerHTML = `<span class="badge weak">Weak</span><p>${result.message}</p>`;
    return;
  }

  const dscrDisplay = result.dscr.toFixed(2);
  const bandLabel = bandCopy(result.band);

  panelDscr.textContent = dscrDisplay;
  panelBand.textContent = bandLabel;

  calculatorResult.classList.remove("hidden");
  calculatorResult.innerHTML = `
    <p>Total Debt Service: <strong>${formatMoney(result.debtService)}</strong></p>
    <p>DSCR: <strong>${dscrDisplay}</strong></p>
    <p>Qualification: <span class="badge ${result.band}">${bandLabel}</span></p>
  `;
}

function collectCalculatorValues() {
  const formData = new FormData(calculatorForm);
  return {
    rentalIncome: calculatorCore.toPositiveNumber(formData.get("rentalIncome")),
    principalInterest: calculatorCore.toPositiveNumber(formData.get("principalInterest")),
    propertyTaxes: calculatorCore.toPositiveNumber(formData.get("propertyTaxes")),
    insurance: calculatorCore.toPositiveNumber(formData.get("insurance")),
    hoa: calculatorCore.toPositiveNumber(formData.get("hoa")),
    otherExpenses: calculatorCore.toPositiveNumber(formData.get("otherExpenses"))
  };
}

function runCalculator(emitAnalytics) {
  const values = collectCalculatorValues();
  const result = calculatorCore.calculateDscr(values);

  if (emitAnalytics) {
    pushEvent("calculator_submit", {
      rentalIncome: values.rentalIncome,
      debtService: Number(result.debtService.toFixed(2)),
      band: result.band
    });
  }

  renderCalculator(values, result);
}

calculatorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runCalculator(true);
});

calculatorForm.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", () => runCalculator(false));
});

runCalculator(false);

async function submitLead(payload) {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.error || "Unable to submit lead at this time.");
  }

  return body;
}

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  leadStatus.classList.remove("error");

  const formData = new FormData(leadForm);
  const payload = {
    firstName: String(formData.get("firstName") || "").trim(),
    lastName: String(formData.get("lastName") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    loanPurpose: String(formData.get("loanPurpose") || "").trim(),
    propertyType: String(formData.get("propertyType") || "").trim(),
    creditScoreRange: String(formData.get("creditScoreRange") || "").trim(),
    entityType: String(formData.get("entityType") || "").trim(),
    submittedAt: Number(formData.get("submittedAt") || 0),
    website: String(formData.get("website") || "").trim()
  };

  const missing = Object.entries(payload)
    .filter(([key, value]) => key !== "website" && key !== "submittedAt" && !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    leadStatus.textContent = "Please complete all required fields before submitting.";
    leadStatus.classList.add("error");
    setSubmissionTimestamp();
    return;
  }

  try {
    const result = await submitLead(payload);
    pushEvent("lead_submit", {
      leadId: result.leadId || "unknown",
      loanPurpose: payload.loanPurpose,
      entityType: payload.entityType
    });

    leadStatus.textContent = "Thank you. Your lead has been submitted successfully.";
    leadForm.reset();
    setSubmissionTimestamp();
  } catch (error) {
    leadStatus.textContent = error.message;
    leadStatus.classList.add("error");
    setSubmissionTimestamp();
  }
});
