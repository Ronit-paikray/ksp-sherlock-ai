"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../functions/sherlock_api");

test("health route reports loaded cases", async () => {
  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.ok, true);
  assert.ok(response.body.cases >= 25);
});

test("chat finds UPI fraud cases above threshold", async () => {
  const response = await request(app)
    .post("/api/chat")
    .send({ message: "Show UPI fraud cases above 50000 in Bengaluru in 2025" })
    .expect(200);
  assert.ok(response.body.matchingCaseIds.includes("FIR-1023"));
  assert.ok(response.body.confidence >= 70);
});

test("FIR analyzer extracts key entities", async () => {
  const response = await request(app)
    .post("/api/fir/analyze")
    .send({
      text: "FIR-3001 victim: Demo Person reported UPI fraud at Bengaluru on 12/08/2025 19:30. Phone 9000009001, UPI refunddesk@upi, vehicle KA-05-MX-4481, amount ₹76,000."
    })
    .expect(200);
  assert.equal(response.body.caseId, "FIR-3001");
  assert.equal(response.body.crimeType, "UPI fraud");
  assert.ok(response.body.phoneNumbers.includes("9000009001"));
  assert.ok(response.body.upiReferences.includes("refunddesk@upi"));
  assert.equal(response.body.riskLevel, "High");
});

test("similar route returns related FIR-1023 matches", async () => {
  const response = await request(app).post("/api/cases/similar").send({ caseId: "FIR-1023" }).expect(200);
  assert.equal(response.body.baseCase.id, "FIR-1023");
  assert.ok(response.body.matches.some((item) => item.caseId === "FIR-1001"));
});
