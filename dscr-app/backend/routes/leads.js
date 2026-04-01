const express = require("express");
const fs = require("fs");
const path = require("path");
const { createRateLimiter } = require("../lib/rateLimiter");

const router = express.Router();

const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "leads.json");
const MIN_SECONDS_BETWEEN_SUBMITS = 5;
const rateLimiter = createRateLimiter();

const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "loanPurpose",
  "propertyType",
  "creditScoreRange",
  "entityType"
];

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function validateLead(payload) {
  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = payload[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missingFields.length > 0) {
    return { valid: false, missingFields };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(payload.email)) {
    return { valid: false, message: "Invalid email format" };
  }

  return { valid: true };
}

function appendLead(lead) {
  ensureStorage();

  const raw = fs.readFileSync(DATA_FILE, "utf8");
  let leads = [];

  try {
    const parsed = JSON.parse(raw);
    leads = Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    leads = [];
  }

  leads.push(lead);
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), "utf8");
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "unknown";
}

function isLikelySpam(payload) {
  if (typeof payload.website === "string" && payload.website.trim() !== "") {
    return true;
  }

  const submittedAtMs = Number(payload.submittedAt || 0);
  if (Number.isFinite(submittedAtMs) && submittedAtMs > 0) {
    const deltaSeconds = (Date.now() - submittedAtMs) / 1000;
    if (deltaSeconds >= 0 && deltaSeconds < MIN_SECONDS_BETWEEN_SUBMITS) {
      return true;
    }
  }

  return false;
}

router.post("/", async (req, res) => {
  const payload = req.body || {};
  const clientIp = getClientIp(req);

  try {
    if (await rateLimiter.isLimited(clientIp)) {
      return res.status(429).json({
        error: "Too many submissions. Please wait before trying again."
      });
    }
  } catch (error) {
    console.error("Rate limiter check failed:", error);
  }

  if (isLikelySpam(payload)) {
    return res.status(400).json({ error: "Spam check failed." });
  }

  const validation = validateLead(payload);

  if (!validation.valid) {
    return res.status(400).json({
      error: validation.message || "Missing required fields",
      missingFields: validation.missingFields || []
    });
  }

  const lead = {
    id: `lead_${Date.now()}`,
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    email: payload.email.trim().toLowerCase(),
    phone: payload.phone.trim(),
    loanPurpose: payload.loanPurpose.trim(),
    propertyType: payload.propertyType.trim(),
    creditScoreRange: payload.creditScoreRange.trim(),
    entityType: payload.entityType.trim(),
    createdAt: new Date().toISOString()
  };

  try {
    appendLead(lead);
    console.log("New lead captured:", lead);

    return res.status(201).json({
      message: "Lead captured successfully",
      leadId: lead.id
    });
  } catch (error) {
    console.error("Failed to persist lead:", error);
    return res.status(500).json({ error: "Unable to save lead" });
  }
});

module.exports = router;
