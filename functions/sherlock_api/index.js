"use strict";

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const dataPath = path.join(__dirname, "data", "cases.json");

app.use(cors());
app.use(express.json({ limit: "1mb" }));

let memoryCases = loadCases();

function loadCases() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function persistCases(cases) {
  memoryCases = cases;
  if (process.env.NODE_ENV === "test") return;
  try {
    fs.writeFileSync(dataPath, `${JSON.stringify(cases, null, 2)}\n`);
  } catch (error) {
    // Catalyst function files may be read-only; in-memory edits still work during the process lifetime.
  }
}

function sanitize(value) {
  if (typeof value === "string") {
    return value.replace(/[<>]/g, "").trim().slice(0, 6000);
  }
  if (Array.isArray(value)) return value.map(sanitize).slice(0, 100);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^\w\s@.-]/g, " ");
}

function caseTerms(record) {
  const entityValues = Object.values(record.entities || {}).flat();
  return [
    record.id,
    record.title,
    record.crimeType,
    record.category,
    record.status,
    record.city,
    record.location,
    record.jurisdiction,
    record.narrative,
    ...(record.keywords || []),
    ...entityValues,
    ...(record.suspects || []).flatMap((suspect) => Object.values(suspect))
  ]
    .filter(Boolean)
    .map((item) => normalize(item));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getCaseById(id) {
  const key = String(id || "").toUpperCase();
  return memoryCases.find((record) => record.id.toUpperCase() === key);
}

function compactCase(record) {
  return {
    id: record.id,
    title: record.title,
    crimeType: record.crimeType,
    status: record.status,
    city: record.city,
    location: record.location,
    dateTime: record.dateTime,
    amount: record.amount,
    riskLevel: record.riskLevel,
    suspects: (record.suspects || []).map((suspect) => suspect.name)
  };
}

function amountFromQuery(query) {
  const match = query.match(/(?:above|over|more than|greater than)\s*(?:rs|inr|₹)?\s*([\d,]+)/i);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function filterCasesByQuery(rawQuery) {
  const query = normalize(rawQuery);
  let results = [...memoryCases];
  const reasons = [];

  const city = ["bengaluru", "mysuru", "hubballi", "mangaluru", "belagavi", "dharwad", "shivamogga", "udupi", "kalaburagi"].find((item) =>
    query.includes(item)
  );
  if (city) {
    results = results.filter((record) => normalize(record.city).includes(city));
    reasons.push(`city=${city}`);
  }

  const year = query.match(/\b(2024|2025|2026)\b/)?.[1];
  if (year) {
    results = results.filter((record) => record.dateTime.startsWith(year));
    reasons.push(`year=${year}`);
  }

  const amount = amountFromQuery(rawQuery);
  if (amount !== null) {
    results = results.filter((record) => Number(record.amount || 0) > amount);
    reasons.push(`amount>${amount}`);
  }

  const crimeMap = [
    ["upi", "UPI fraud"],
    ["cyber", "Cyber fraud"],
    ["sim swap", "SIM swap fraud"],
    ["vehicle theft", "Vehicle theft"],
    ["mobile theft", "Mobile theft"],
    ["burglary", "Burglary"],
    ["chain", "Chain snatching"],
    ["atm", "ATM fraud"],
    ["loan app", "Loan app harassment"],
    ["marketplace", "Online marketplace scam"]
  ];
  const crime = crimeMap.find(([needle]) => query.includes(needle));
  if (crime) {
    const [, label] = crime;
    results = results.filter((record) => normalize(`${record.crimeType} ${record.category}`).includes(normalize(label.split(" ")[0])));
    reasons.push(`crime=${label}`);
  }

  if (query.includes("pending")) {
    results = results.filter((record) => normalize(record.status).includes("pending"));
    reasons.push("status=pending");
  }
  if (query.includes("solved")) {
    results = results.filter((record) => normalize(record.status).includes("solved"));
    reasons.push("status=solved");
  }

  if (query.includes("repeat offender")) {
    const offenderCounts = memoryCases.reduce((acc, record) => {
      (record.suspects || []).forEach((suspect) => {
        acc[suspect.offenderId] = (acc[suspect.offenderId] || 0) + 1;
      });
      return acc;
    }, {});
    results = results.filter((record) => (record.suspects || []).some((suspect) => offenderCounts[suspect.offenderId] > 1));
    reasons.push("repeat-offender");
  }

  const freeTokens = query.split(/\s+/).filter((token) => token.length > 3 && !["show", "find", "list", "case", "cases", "above", "than"].includes(token));
  if (reasons.length === 0 && freeTokens.length) {
    results = results
      .map((record) => {
        const haystack = caseTerms(record).join(" ");
        const score = freeTokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
        return { record, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.record);
  }

  return { results, reasons };
}

function entitySet(record) {
  const entities = record.entities || {};
  return new Set(
    [
      ...(entities.phones || []),
      ...(entities.upiIds || []),
      ...(entities.bankAccounts || []),
      ...(entities.vehicles || []),
      ...(record.suspects || []).map((suspect) => suspect.offenderId)
    ].map(normalize)
  );
}

function keywordSet(record) {
  return new Set([record.crimeType, record.category, record.city, record.location, ...(record.keywords || [])].map(normalize));
}

function similarity(a, b) {
  const aEntities = entitySet(a);
  const bEntities = entitySet(b);
  const aKeywords = keywordSet(a);
  const bKeywords = keywordSet(b);
  const sharedEntities = [...aEntities].filter((item) => bEntities.has(item));
  const sharedKeywords = [...aKeywords].filter((item) => bKeywords.has(item));
  let score = 0;
  if (normalize(a.crimeType) === normalize(b.crimeType)) score += 28;
  if (normalize(a.city) === normalize(b.city)) score += 14;
  score += Math.min(30, sharedEntities.length * 10);
  score += Math.min(22, sharedKeywords.length * 5);
  if (a.dateTime.slice(0, 4) === b.dateTime.slice(0, 4)) score += 4;
  if (Math.abs(Number(a.amount || 0) - Number(b.amount || 0)) < 30000) score += 4;

  const reasons = [];
  if (normalize(a.crimeType) === normalize(b.crimeType)) reasons.push(`same crime type (${a.crimeType})`);
  if (normalize(a.city) === normalize(b.city)) reasons.push(`same city (${a.city})`);
  if (sharedEntities.length) reasons.push(`shared entities: ${sharedEntities.slice(0, 4).join(", ")}`);
  if (sharedKeywords.length) reasons.push(`shared keywords: ${sharedKeywords.slice(0, 4).join(", ")}`);

  return {
    caseId: b.id,
    percentage: Math.min(98, score),
    reason: reasons.join("; ") || "general narrative and metadata overlap",
    case: compactCase(b)
  };
}

function summarize(record) {
  return `${record.id} is a ${record.riskLevel.toLowerCase()}-risk ${record.crimeType} case in ${record.location}, ${record.city}. ${record.narrative}`;
}

function riskFromAnalysis(analysis) {
  const highCrime = /sim swap|loan app|cyber|upi|atm/i.test(analysis.crimeType || "");
  const highAmount = Number(analysis.amount || 0) >= 50000;
  const entityCount = analysis.phoneNumbers.length + analysis.upiReferences.length + analysis.bankReferences.length;
  if ((highCrime && highAmount) || entityCount >= 4) return "High";
  if (highCrime || highAmount || entityCount >= 2) return "Medium";
  return "Low";
}

function analyzeFirText(text) {
  const cleanText = sanitize(text || "");
  const phoneNumbers = unique(cleanText.match(/\b[6-9]\d{9}\b/g) || []);
  const vehicleNumbers = unique(cleanText.match(/\b[A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,2}[-\s]?\d{3,4}\b/gi) || []).map((item) =>
    item.toUpperCase().replace(/\s+/g, "-")
  );
  const upiReferences = unique(cleanText.match(/\b[a-zA-Z0-9._-]+@[a-zA-Z]{2,}\b/g) || []);
  const bankReferences = unique(cleanText.match(/\b(?:A\/C|AC|account|bank)\s*[:#-]?\s*([A-Z0-9-]{5,})\b/gi) || []);
  const caseId = cleanText.match(/\bFIR[-\s]?\d{4}\b/i)?.[0]?.toUpperCase().replace(/\s+/, "-") || `FIR-DRAFT-${Date.now().toString().slice(-5)}`;
  const amount = Number((cleanText.match(/(?:rs|inr|₹)\s*([\d,]+)/i)?.[1] || "0").replace(/,/g, ""));
  const dateTime = cleanText.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:\s+\d{1,2}:\d{2})?\b/)?.[0] || "";
  const location =
    cleanText.match(/(?:location|place|near|at)\s*[:,-]?\s*([A-Za-z ]{3,40})/i)?.[1]?.trim() ||
    ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi", "Dharwad", "Udupi"].find((city) => cleanText.includes(city)) ||
    "Unknown";
  const victim = cleanText.match(/(?:victim|complainant)\s*[:,-]?\s*([A-Za-z ]{3,40})/i)?.[1]?.trim() || "Not specified";
  const suspect = cleanText.match(/(?:suspect|accused)\s*[:,-]?\s*([A-Za-z0-9 ]{3,40})/i)?.[1]?.trim() || "Unknown";
  const lowered = cleanText.toLowerCase();
  const crimeType =
    [
      ["upi", "UPI fraud"],
      ["sim swap", "SIM swap fraud"],
      ["loan app", "Loan app harassment"],
      ["atm", "ATM fraud"],
      ["marketplace", "Online marketplace scam"],
      ["cyber", "Cyber fraud"],
      ["burglary", "Burglary"],
      ["chain", "Chain snatching"],
      ["mobile theft", "Mobile theft"],
      ["vehicle theft", "Vehicle theft"]
    ].find(([needle]) => lowered.includes(needle))?.[1] || "Cyber fraud";
  const sentences = cleanText.split(/[.!?]\s+/).filter(Boolean);
  const timeline = unique([
    ...sentences.filter((sentence) => /\b(at|on|around|\d{1,2}:\d{2}|\d{1,2}[/-]\d{1,2})\b/i.test(sentence)).slice(0, 5),
    dateTime && `Reported incident date/time: ${dateTime}`
  ]);
  const analysis = {
    caseId,
    crimeType,
    victim,
    suspect,
    location,
    dateTime,
    amount,
    phoneNumbers,
    vehicleNumbers,
    upiReferences,
    bankReferences,
    summary: sentences.slice(0, 3).join(". ") || cleanText.slice(0, 260),
    timeline,
    riskLevel: "Low"
  };
  analysis.riskLevel = riskFromAnalysis(analysis);
  return analysis;
}

function reportFor(record) {
  const related = memoryCases
    .filter((item) => item.id !== record.id)
    .map((item) => similarity(record, item))
    .filter((item) => item.percentage >= 35)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  const entities = {
    suspects: (record.suspects || []).map((suspect) => `${suspect.name} (${suspect.offenderId})`),
    phones: record.entities?.phones || [],
    upiIds: record.entities?.upiIds || [],
    bankAccounts: record.entities?.bankAccounts || [],
    vehicles: record.entities?.vehicles || [],
    locations: record.entities?.locations || []
  };

  const riskScore = record.riskLevel === "High" ? 86 : record.riskLevel === "Medium" ? 62 : 34;

  return {
    caseId: record.id,
    generatedAt: new Date().toISOString(),
    caseSummary: summarize(record),
    keyEntities: entities,
    relatedCases: related,
    suggestedInvestigationSteps: [
      "Freeze or monitor shared mule accounts and UPI IDs.",
      "Request CDR and subscriber details for overlapping phone numbers.",
      "Compare CCTV, vehicle, and device identifiers with related FIRs.",
      "Prioritize victim outreach and evidence preservation for high-risk digital traces.",
      "Create a joint lead packet for jurisdictions with shared entities."
    ],
    riskScore,
    exportText: [
      `Investigation Report - ${record.id}`,
      summarize(record),
      `Risk Score: ${riskScore}`,
      `Entities: ${JSON.stringify(entities)}`,
      `Related Cases: ${related.map((item) => `${item.caseId} (${item.percentage}%)`).join(", ")}`,
      "Suggested Steps:",
      "- Freeze or monitor shared mule accounts and UPI IDs.",
      "- Request CDR and subscriber details for overlapping phone numbers.",
      "- Compare CCTV, vehicle, and device identifiers with related FIRs.",
      "- Prioritize victim outreach and evidence preservation."
    ].join("\n")
  };
}

app.get("/api/health", (req, res) => {
  res.send({ ok: true, service: "ksp-sherlock-ai", cases: memoryCases.length });
});

app.get("/api/cases", (req, res) => {
  const query = sanitize(req.query || {});
  let cases = [...memoryCases];
  if (query.status) cases = cases.filter((record) => normalize(record.status).includes(normalize(query.status)));
  if (query.city) cases = cases.filter((record) => normalize(record.city).includes(normalize(query.city)));
  if (query.crimeType) cases = cases.filter((record) => normalize(record.crimeType).includes(normalize(query.crimeType)));
  res.send(cases.map(compactCase));
});

app.get("/api/cases/:id", (req, res) => {
  const record = getCaseById(req.params.id);
  if (!record) return res.status(404).send({ error: "Case not found" });
  return res.send(record);
});

app.post("/api/chat", (req, res) => {
  const { message } = sanitize(req.body || {});
  if (!message) return res.status(400).send({ error: "message is required" });

  const query = normalize(message);
  const id = message.match(/\bFIR[-\s]?\d{4}\b/i)?.[0]?.toUpperCase().replace(/\s+/, "-");

  if (id && query.includes("similar")) {
    const base = getCaseById(id);
    if (!base) return res.status(404).send({ error: "Reference case not found" });
    const related = memoryCases
      .filter((record) => record.id !== base.id)
      .map((record) => similarity(base, record))
      .filter((item) => item.percentage >= 25)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);
    return res.send({
      answer: `Found ${related.length} cases similar to ${id}. Strongest links include shared crime type, entity reuse, and location overlap.`,
      matchingCaseIds: related.map((item) => item.caseId),
      confidence: related[0]?.percentage || 50,
      suggestedNextActions: ["Review shared UPI/phone entities", "Bundle linked FIRs for a lead review", "Check jurisdiction overlap"],
      matches: related
    });
  }

  if (id && (query.includes("summarize") || query.includes("summary"))) {
    const record = getCaseById(id);
    if (!record) return res.status(404).send({ error: "Case not found" });
    return res.send({
      answer: summarize(record),
      matchingCaseIds: [record.id],
      confidence: 92,
      suggestedNextActions: ["Generate full report", "Open relationship graph", "Search related cases"],
      matches: [compactCase(record)]
    });
  }

  const { results, reasons } = filterCasesByQuery(message);
  const confidence = Math.min(94, 58 + reasons.length * 12 + Math.min(20, results.length * 2));
  return res.send({
    answer:
      results.length > 0
        ? `Found ${results.length} matching case(s). Filters detected: ${reasons.join(", ") || "semantic keyword search"}.`
        : "No strong matches found. Try adding a city, year, crime type, amount threshold, or FIR number.",
    matchingCaseIds: results.map((record) => record.id),
    confidence,
    suggestedNextActions: ["Open top matching case", "Run similar-case detection", "Generate an investigation report"],
    matches: results.slice(0, 10).map(compactCase)
  });
});

app.post("/api/fir/analyze", (req, res) => {
  const { text } = sanitize(req.body || {});
  if (!text) return res.status(400).send({ error: "text is required" });
  res.send(analyzeFirText(text));
});

app.post("/api/cases/similar", (req, res) => {
  const body = sanitize(req.body || {});
  const base = body.caseId ? getCaseById(body.caseId) : body.caseData;
  if (!base) return res.status(400).send({ error: "caseId or caseData is required" });
  const related = memoryCases
    .filter((record) => record.id !== base.id)
    .map((record) => similarity(base, record))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, Number(body.limit || 8));
  res.send({ baseCase: compactCase(base), matches: related });
});

app.get("/api/graph/:caseId", (req, res) => {
  const record = getCaseById(req.params.caseId);
  if (!record) return res.status(404).send({ error: "Case not found" });
  const nodes = [{ id: record.id, label: record.id, type: "case", detail: record.title }];
  const edges = [];
  const addNode = (id, label, type, detail = "") => {
    if (!nodes.some((node) => node.id === id)) nodes.push({ id, label, type, detail });
    edges.push({ id: `${record.id}-${id}`, source: record.id, target: id, label: type });
  };
  (record.suspects || []).forEach((suspect) => addNode(suspect.offenderId, suspect.name, "suspect", suspect.phone || ""));
  if (record.victim?.name) addNode(`victim-${record.victim.phone}`, record.victim.name, "victim", record.victim.phone);
  Object.entries(record.entities || {}).forEach(([type, values]) => {
    values.forEach((value) => addNode(`${type}-${value}`, value, type));
  });
  memoryCases
    .filter((item) => item.id !== record.id)
    .map((item) => similarity(record, item))
    .filter((item) => item.percentage >= 40)
    .slice(0, 6)
    .forEach((item) => {
      nodes.push({ id: item.caseId, label: item.caseId, type: "relatedCase", detail: item.reason });
      edges.push({ id: `${record.id}-${item.caseId}`, source: record.id, target: item.caseId, label: `${item.percentage}%` });
    });
  res.send({ caseId: record.id, nodes, edges });
});

app.post("/api/report/generate", (req, res) => {
  const { caseId } = sanitize(req.body || {});
  const record = getCaseById(caseId);
  if (!record) return res.status(404).send({ error: "Case not found" });
  res.send(reportFor(record));
});

app.post("/api/cases", (req, res) => {
  const body = sanitize(req.body || {});
  const nextNumber =
    Math.max(...memoryCases.map((record) => Number(record.id.replace(/\D/g, ""))).filter(Boolean), 1025) + 1;
  const record = {
    id: body.id || `FIR-${nextNumber}`,
    title: body.title || "Untitled fictional case",
    crimeType: body.crimeType || "Cyber fraud",
    category: body.category || "Cyber fraud",
    status: body.status || "Pending",
    city: body.city || "Bengaluru",
    location: body.location || "Unknown",
    jurisdiction: body.jurisdiction || "Unassigned PS",
    dateTime: body.dateTime || new Date().toISOString(),
    amount: Number(body.amount || 0),
    riskLevel: body.riskLevel || "Medium",
    victim: body.victim || { name: "Fictional Victim", phone: "" },
    suspects: body.suspects || [],
    entities: body.entities || { phones: [], upiIds: [], bankAccounts: [], vehicles: [], locations: [] },
    keywords: body.keywords || [],
    narrative: body.narrative || "Fictional case created from admin panel.",
    timeline: body.timeline || [],
    evidence: body.evidence || []
  };
  if (getCaseById(record.id)) return res.status(409).send({ error: "Case ID already exists" });
  persistCases([...memoryCases, record]);
  res.status(201).send(record);
});

app.put("/api/cases/:id", (req, res) => {
  const existing = getCaseById(req.params.id);
  if (!existing) return res.status(404).send({ error: "Case not found" });
  const body = sanitize(req.body || {});
  const updated = { ...existing, ...body, id: existing.id };
  persistCases(memoryCases.map((record) => (record.id === existing.id ? updated : record)));
  res.send(updated);
});

app.delete("/api/cases/:id", (req, res) => {
  const existing = getCaseById(req.params.id);
  if (!existing) return res.status(404).send({ error: "Case not found" });
  persistCases(memoryCases.filter((record) => record.id !== existing.id));
  res.send({ deleted: existing.id });
});

app.use((req, res) => {
  res.status(404).send({ error: "Route not found" });
});

module.exports = app;
module.exports._internals = { analyzeFirText, filterCasesByQuery, similarity, getCaseById, reportFor };
