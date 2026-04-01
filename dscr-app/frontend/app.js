const calculatorForm = document.getElementById("calculator-form");
const leadForm = document.getElementById("lead-form");
const calculatorResult = document.getElementById("calculator-result");
const leadStatus = document.getElementById("lead-status");
const submittedAtInput = document.getElementById("submittedAt");

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

function onCalculatorStart() {
  if (!analyticsState.calculatorStarted) {
    analyticsState.calculatorStarted = true;
    pushEvent("calculator_start");
  }
}

calculatorForm.addEventListener("focusin", onCalculatorStart, { once: false });

calculatorForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(calculatorForm);
  const values = {
    rentalIncome: calculatorCore.toPositiveNumber(formData.get("rentalIncome")),
    principalInterest: calculatorCore.toPositiveNumber(formData.get("principalInterest")),
    propertyTaxes: calculatorCore.toPositiveNumber(formData.get("propertyTaxes")),
    insurance: calculatorCore.toPositiveNumber(formData.get("insurance")),
    hoa: calculatorCore.toPositiveNumber(formData.get("hoa")),
    otherExpenses: calculatorCore.toPositiveNumber(formData.get("otherExpenses"))
  };

  const result = calculatorCore.calculateDscr(values);

  pushEvent("calculator_submit", {
    rentalIncome: values.rentalIncome,
    debtService: Number(result.debtService.toFixed(2)),
    band: result.band
  });

  calculatorResult.classList.remove("hidden");

  if (result.message) {
    calculatorResult.innerHTML = `<span class="badge weak">Weak</span><p>${result.message}</p>`;
    return;
  }

  const dscrDisplay = result.dscr.toFixed(2);
  const bandLabel = bandCopy(result.band);

  calculatorResult.innerHTML = `
    <p>Total Debt Service: <strong>${formatMoney(result.debtService)}</strong></p>
    <p>DSCR: <strong>${dscrDisplay}</strong></p>
    <p>Qualification: <span class="badge ${result.band}">${bandLabel}</span></p>
  `;
});

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
