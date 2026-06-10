"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

process.env.NODE_ENV = "test";
process.env.AI_DEMO_MODE = "true";
process.env.PRIMARY_MODEL = "deepseek/deepseek-v4-flash";
process.env.FALLBACK_MODEL = "google/gemini-2.5-flash";

const app = require("../functions/sherlock_api");

test("health route reports loaded cases", async () => {
  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.ok, true);
  assert.ok(response.body.cases >= 25);
  assert.equal(response.body.ai.primaryModel, "deepseek/deepseek-v4-flash");
  assert.equal(response.body.ai.fallbackModel, "google/gemini-2.5-flash");
});

test("GET /api/cases and GET /api/cases/:id return case records", async () => {
  const list = await request(app).get("/api/cases").expect(200);
  assert.ok(Array.isArray(list.body));
  assert.ok(list.body.length >= 25);
  assert.ok(list.body.some((item) => item.id === "FIR-1023"));

  const detail = await request(app).get("/api/cases/FIR-1023").expect(200);
  assert.equal(detail.body.id, "FIR-1023");
  assert.equal(detail.body.crimeType, "UPI fraud");
});

test("POST /api/chat finds UPI fraud cases above threshold", async () => {
  const response = await request(app)
    .post("/api/chat")
    .send({ message: "Show UPI fraud cases above 50000 in Bengaluru in 2025" })
    .expect(200);
  assert.ok(response.body.matchingCaseIds.includes("FIR-1023"));
  assert.ok(response.body.confidence >= 70);
  assert.equal(response.body.ai.mode, "demo");
});

test("POST /api/fir/analyze extracts key entities", async () => {
  const response = await request(app)
    .post("/api/fir/analyze")
    .send({
      text: "FIR-3001 victim: Demo Person reported UPI fraud at Bengaluru on 12/08/2025 19:30. Phone 9000009001, UPI refunddesk@upi, vehicle KA-05-MX-4481, amount INR 76,000."
    })
    .expect(200);
  assert.equal(response.body.caseId, "FIR-3001");
  assert.equal(response.body.crimeType, "UPI fraud");
  assert.ok(response.body.phoneNumbers.includes("9000009001"));
  assert.ok(response.body.upiReferences.includes("refunddesk@upi"));
  assert.equal(response.body.riskLevel, "High");
  assert.equal(response.body.ai.mode, "demo");
});

test("POST /api/cases/similar returns related FIR-1023 matches", async () => {
  const response = await request(app).post("/api/cases/similar").send({ caseId: "FIR-1023" }).expect(200);
  assert.equal(response.body.baseCase.id, "FIR-1023");
  assert.ok(response.body.matches.some((item) => item.caseId === "FIR-1001"));
});

test("GET /api/graph/:caseId returns nodes and edges", async () => {
  const response = await request(app).get("/api/graph/FIR-1023").expect(200);
  assert.equal(response.body.caseId, "FIR-1023");
  assert.ok(response.body.nodes.some((node) => node.id === "FIR-1023"));
  assert.ok(response.body.edges.length > 0);
});

test("POST /api/report/generate generates investigation report", async () => {
  const response = await request(app).post("/api/report/generate").send({ caseId: "FIR-1023" }).expect(200);
  assert.equal(response.body.caseId, "FIR-1023");
  assert.ok(response.body.caseSummary.includes("FIR-1023"));
  assert.ok(response.body.riskScore > 0);
  assert.ok(response.body.exportText.includes("Investigation Report"));
  assert.equal(response.body.ai.mode, "demo");
});

test("case CRUD routes create, update, and delete a mock record", async () => {
  await request(app).delete("/api/cases/FIR-9999");

  const create = await request(app)
    .post("/api/cases")
    .send({
      id: "FIR-9999",
      title: "Temporary test UPI fraud record",
      crimeType: "UPI fraud",
      category: "Cyber fraud",
      status: "Pending",
      city: "Bengaluru",
      location: "Test Layout",
      jurisdiction: "Test PS",
      amount: 61000,
      riskLevel: "High",
      victim: { name: "Fictional Test Victim", phone: "9000001999" },
      suspects: [{ name: "Fictional Test Suspect", offenderId: "OFF-999", phone: "9000009999", upi: "testcase@upi" }],
      entities: {
        phones: ["9000001999", "9000009999"],
        upiIds: ["testcase@upi"],
        bankAccounts: ["TEST-FIC-9999"],
        vehicles: [],
        locations: ["Test Layout", "Bengaluru"]
      },
      keywords: ["upi", "test"],
      narrative: "Temporary fictional case used only by automated tests.",
      timeline: ["Created during automated verification"],
      evidence: ["Test evidence"]
    })
    .expect(201);
  assert.equal(create.body.id, "FIR-9999");

  const update = await request(app)
    .put("/api/cases/FIR-9999")
    .send({ status: "Solved", riskLevel: "Medium" })
    .expect(200);
  assert.equal(update.body.status, "Solved");
  assert.equal(update.body.riskLevel, "Medium");

  await request(app).get("/api/cases/FIR-9999").expect(200);
  await request(app).delete("/api/cases/FIR-9999").expect(200);
  await request(app).get("/api/cases/FIR-9999").expect(404);
});

test("Netlify function adapter maps /api routes correctly", async () => {
  const { handler } = require("../netlify/functions/api");
  const response = await handler(
    {
      httpMethod: "GET",
      path: "/.netlify/functions/api/health",
      rawQuery: "",
      headers: {},
      body: null,
      isBase64Encoded: false
    },
    {}
  );
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).ok, true);
});
