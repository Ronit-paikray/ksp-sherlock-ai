const envBase = import.meta.env.VITE_API_BASE;

export const API_BASE =
  envBase ||
  (window.location.hostname.includes("catalyst") || window.location.pathname.includes("/app/")
    ? "/server/sherlock_api"
    : "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
}

export const api = {
  cases: () => request("/api/cases"),
  case: (id) => request(`/api/cases/${encodeURIComponent(id)}`),
  chat: (message) => request("/api/chat", { method: "POST", body: JSON.stringify({ message }) }),
  analyzeFir: (text) => request("/api/fir/analyze", { method: "POST", body: JSON.stringify({ text }) }),
  similar: (caseId) => request("/api/cases/similar", { method: "POST", body: JSON.stringify({ caseId }) }),
  graph: (caseId) => request(`/api/graph/${encodeURIComponent(caseId)}`),
  report: (caseId) => request("/api/report/generate", { method: "POST", body: JSON.stringify({ caseId }) }),
  createCase: (record) => request("/api/cases", { method: "POST", body: JSON.stringify(record) }),
  updateCase: (id, record) => request(`/api/cases/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(record) }),
  deleteCase: (id) => request(`/api/cases/${encodeURIComponent(id)}`, { method: "DELETE" })
};
