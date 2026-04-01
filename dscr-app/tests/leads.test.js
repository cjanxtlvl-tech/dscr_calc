const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { createApp } = require("../backend/server");

const app = createApp();

const validPayload = {
  firstName: "Alex",
  lastName: "Investor",
  email: "alex@example.com",
  phone: "555-123-4567",
  loanPurpose: "purchase",
  propertyType: "single-family",
  creditScoreRange: "720-759",
  entityType: "llc"
};

test("POST /api/leads returns 400 for missing fields", async () => {
  const response = await request(app)
    .post("/api/leads")
    .send({ firstName: "Alex" })
    .set("Content-Type", "application/json");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Missing required fields");
});

test("POST /api/leads returns 201 for valid payload", async () => {
  const response = await request(app)
    .post("/api/leads")
    .send(validPayload)
    .set("Content-Type", "application/json");

  assert.equal(response.status, 201);
  assert.equal(response.body.message, "Lead captured successfully");
  assert.match(String(response.body.leadId), /^lead_/);
});

test("POST /api/leads blocks honeypot spam", async () => {
  const response = await request(app)
    .post("/api/leads")
    .send({
      ...validPayload,
      email: "alex+2@example.com",
      website: "https://spam.example"
    })
    .set("Content-Type", "application/json");

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Spam check failed.");
});

test("POST /api/leads returns 429 after too many submissions from same IP", async () => {
  const ip = "203.0.113.10";
  const responses = [];

  for (let i = 0; i < 6; i += 1) {
    const response = await request(app)
      .post("/api/leads")
      .set("X-Forwarded-For", ip)
      .set("Content-Type", "application/json")
      .send({
        ...validPayload,
        email: `rate-limit-${i}@example.com`
      });

    responses.push(response.status);
  }

  assert.deepEqual(responses.slice(0, 5), [201, 201, 201, 201, 201]);
  assert.equal(responses[5], 429);
});
