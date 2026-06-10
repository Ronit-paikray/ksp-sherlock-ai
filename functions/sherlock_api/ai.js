"use strict";

const fs = require("fs");
const path = require("path");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
let localEnvLoaded = false;

function loadLocalEnv() {
  if (localEnvLoaded || process.env.OPENROUTER_API_KEY) return;
  localEnvLoaded = true;
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

function aiConfig() {
  loadLocalEnv();
  return {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    primaryModel: process.env.PRIMARY_MODEL || "deepseek/deepseek-v4-flash",
    fallbackModel: process.env.FALLBACK_MODEL || "google/gemini-2.5-flash",
    devModel: process.env.DEV_MODEL || "qwen/qwen3-coder",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS || 12000),
    demoMode: process.env.AI_DEMO_MODE === "true"
  };
}

function demoAiMeta(reason = "OPENROUTER_API_KEY is not configured") {
  return {
    mode: "demo",
    provider: "local-mock",
    demoFallback: true,
    fallbackUsed: false,
    reason
  };
}

function hasAiConfig() {
  const config = aiConfig();
  return Boolean(config.apiKey) && !config.demoMode;
}

async function callOpenRouterModel(model, messages, options = {}) {
  const config = aiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
        "X-OpenRouter-Title": "KSP Sherlock AI"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens || 900,
        response_format: options.responseFormat
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after");
      throw new Error(`OpenRouter ${response.status}${retryAfter ? ` retry-after=${retryAfter}` : ""}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("OpenRouter returned an invalid response");
    }

    return {
      content: content.trim(),
      meta: {
        mode: "openrouter",
        provider: "openrouter",
        model,
        latencyMs: Date.now() - started,
        fallbackUsed: false,
        demoFallback: false
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function routeAi(messages, options = {}) {
  const config = aiConfig();
  if (!hasAiConfig()) {
    return { ok: false, meta: demoAiMeta(config.demoMode ? "AI_DEMO_MODE is enabled" : undefined) };
  }

  try {
    const primary = await callOpenRouterModel(config.primaryModel, messages, options);
    return { ok: true, content: primary.content, meta: primary.meta };
  } catch (primaryError) {
    try {
      const fallback = await callOpenRouterModel(config.fallbackModel, messages, options);
      return {
        ok: true,
        content: fallback.content,
        meta: {
          ...fallback.meta,
          fallbackUsed: true,
          primaryModel: config.primaryModel,
          primaryError: primaryError.message
        }
      };
    } catch (fallbackError) {
      return {
        ok: false,
        meta: demoAiMeta(`AI fallback used local response: ${fallbackError.message}`),
        errors: {
          primary: primaryError.message,
          fallback: fallbackError.message
        }
      };
    }
  }
}

function parseJsonResponse(content) {
  if (!content) return null;
  const cleaned = content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    return null;
  }
}

module.exports = {
  aiConfig,
  demoAiMeta,
  parseJsonResponse,
  routeAi
};
