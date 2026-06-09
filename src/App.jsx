import { useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import {
  Activity,
  BarChart3,
  Bot,
  Download,
  FileSearch,
  GitBranch,
  Languages,
  LayoutDashboard,
  LogOut,
  Mic,
  Plus,
  Shield,
  Trash2,
  Upload,
  Users
} from "lucide-react";
import { api } from "./lib/api.js";

const navItems = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["chat", "AI Chat", Bot],
  ["fir", "FIR Analysis", Upload],
  ["similar", "Similar Cases", FileSearch],
  ["graph", "Relationship Graph", GitBranch],
  ["reports", "Reports", BarChart3],
  ["admin", "Admin Panel", Users]
];

const labels = {
  en: {
    launch: "Launch Dashboard",
    login: "Demo Login",
    officer: "Officer ID",
    password: "Password",
    role: "Role",
    disclaimer: "Fictional prototype data only"
  },
  kn: {
    launch: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಆರಂಭಿಸಿ",
    login: "ಡೆಮೋ ಲಾಗಿನ್",
    officer: "ಅಧಿಕಾರಿ ID",
    password: "ಪಾಸ್‌ವರ್ಡ್",
    role: "ಪಾತ್ರ",
    disclaimer: "ಕಲ್ಪಿತ ಮಾದರಿ ಡೇಟಾ ಮಾತ್ರ"
  },
  hi: {
    launch: "डैशबोर्ड शुरू करें",
    login: "डेमो लॉगिन",
    officer: "अधिकारी ID",
    password: "पासवर्ड",
    role: "भूमिका",
    disclaimer: "केवल काल्पनिक प्रोटोटाइप डेटा"
  }
};

const sampleFir = `FIR-2099. Complainant: Ramesh Verma. Victim reports UPI fraud at Bengaluru near HSR Layout on 12/08/2025 18:40. Suspect: unknown refund agent called from 9000009001 and shared UPI ID refunddesk@upi. Victim approved collect requests for ₹82,500 from bank account FICBANK-99881. Vehicle number seen nearby KA-05-MX-4481.`;

function Stat({ label, value, tone = "blue" }) {
  return (
    <section className={`stat stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="page-header">
      <div className="page-icon">
        <Icon size={22} />
      </div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function CaseTable({ cases, onPick }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Type</th>
            <th>City</th>
            <th>Status</th>
            <th>Risk</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr key={item.id} onClick={() => onPick?.(item.id)}>
              <td>
                <strong>{item.id}</strong>
                <small>{item.title}</small>
              </td>
              <td>{item.crimeType}</td>
              <td>{item.city}</td>
              <td>{item.status}</td>
              <td>
                <span className={`pill ${item.riskLevel.toLowerCase()}`}>{item.riskLevel}</span>
              </td>
              <td>{item.amount ? `₹${Number(item.amount).toLocaleString("en-IN")}` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [language, setLanguage] = useState("en");
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("landing");
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState("FIR-1023");
  const [error, setError] = useState("");

  const t = labels[language];

  async function refreshCases() {
    try {
      const data = await api.cases();
      setCases(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refreshCases();
  }, []);

  const stats = useMemo(() => {
    const pending = cases.filter((item) => item.status === "Pending").length;
    const solved = cases.filter((item) => item.status === "Solved").length;
    const cyber = cases.filter((item) => item.category === "Cyber fraud" || item.crimeType.includes("UPI")).length;
    const high = cases.filter((item) => item.riskLevel === "High").length;
    return { pending, solved, cyber, high };
  }, [cases]);

  function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setUser({ id: form.get("officerId"), role: form.get("role") });
    setPage("dashboard");
  }

  if (page === "landing") {
    return (
      <main className="landing">
        <div className="landing-bg" />
        <div className="language-float">
          <Languages size={16} />
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="kn">ಕನ್ನಡ</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>
        <section className="hero-copy">
          <span className="eyebrow">Datathon 2026 · Challenge 1</span>
          <h1>KSP Sherlock AI</h1>
          <p>Transforming Crime Records into Actionable Intelligence</p>
          <div className="hero-actions">
            <button onClick={() => setPage("login")} className="primary">
              <Shield size={18} />
              {t.launch}
            </button>
            <span>{t.disclaimer}</span>
          </div>
        </section>
      </main>
    );
  }

  if (page === "login") {
    return (
      <main className="auth-screen">
        <form className="auth-panel" onSubmit={handleLogin}>
          <Shield size={34} />
          <h1>{t.login}</h1>
          <label>
            {t.officer}
            <input name="officerId" defaultValue="KSP-INV-101" required />
          </label>
          <label>
            {t.password}
            <input name="password" type="password" defaultValue="demo123" required />
          </label>
          <label>
            {t.role}
            <select name="role" defaultValue="Investigator">
              <option>Investigator</option>
              <option>Analyst</option>
              <option>Admin</option>
            </select>
          </label>
          <button className="primary" type="submit">Enter Console</button>
        </form>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside>
        <div className="brand">
          <Shield />
          <div>
            <strong>KSP Sherlock AI</strong>
            <span>{user?.role || "Investigator"} Console</span>
          </div>
        </div>
        <nav>
          {navItems.map(([key, label, Icon]) => (
            <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="side-footer">
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option value="en">English</option>
            <option value="kn">ಕನ್ನಡ</option>
            <option value="hi">हिन्दी</option>
          </select>
          <button onClick={() => { setUser(null); setPage("landing"); }}>
            <LogOut size={16} /> Exit
          </button>
        </div>
      </aside>
      <main className="workspace">
        {error && <div className="error">{error}</div>}
        {page === "dashboard" && <Dashboard cases={cases} stats={stats} onPick={(id) => { setSelectedCase(id); setPage("reports"); }} />}
        {page === "chat" && <ChatPage setSelectedCase={setSelectedCase} setPage={setPage} />}
        {page === "fir" && <FirPage />}
        {page === "similar" && <SimilarPage cases={cases} selectedCase={selectedCase} setSelectedCase={setSelectedCase} />}
        {page === "graph" && <GraphPage cases={cases} selectedCase={selectedCase} setSelectedCase={setSelectedCase} />}
        {page === "reports" && <ReportsPage cases={cases} selectedCase={selectedCase} setSelectedCase={setSelectedCase} />}
        {page === "admin" && <AdminPage cases={cases} refreshCases={refreshCases} />}
      </main>
    </div>
  );
}

function Dashboard({ cases, stats, onPick }) {
  return (
    <>
      <PageHeader icon={Activity} title="Crime Intelligence Dashboard" subtitle="Operational summary across the fictional KSP crime database." />
      <div className="stat-grid">
        <Stat label="Total cases" value={cases.length} />
        <Stat label="Pending cases" value={stats.pending} tone="amber" />
        <Stat label="Solved cases" value={stats.solved} tone="green" />
        <Stat label="Cybercrime cases" value={stats.cyber} tone="violet" />
        <Stat label="High-risk alerts" value={stats.high} tone="red" />
      </div>
      <section className="panel">
        <h3>Recent Activity</h3>
        <CaseTable cases={cases.slice(-8).reverse()} onPick={onPick} />
      </section>
    </>
  );
}

function ChatPage({ setSelectedCase, setPage }) {
  const [message, setMessage] = useState("Show UPI fraud cases above ₹50,000");
  const [response, setResponse] = useState(null);
  const [listening, setListening] = useState(false);

  async function send() {
    const data = await api.chat(message);
    setResponse(data);
  }

  function listen() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech Recognition is not available in this browser.");
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => setMessage(event.results[0][0].transcript);
    recognition.start();
  }

  return (
    <>
      <PageHeader icon={Bot} title="AI Crime Search Chat" subtitle="Ask natural-language questions over fictional records." />
      <section className="panel chat-panel">
        <div className="prompt-row">
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          <button className="icon-button" onClick={listen} title="Voice query">
            <Mic size={20} className={listening ? "pulse" : ""} />
          </button>
          <button className="primary" onClick={send}>Search</button>
        </div>
        <div className="quick-prompts">
          {["Show all cyber fraud cases in Bengaluru in 2025", "Find cases similar to FIR-1023", "List repeat offenders involved in vehicle theft", "Summarize FIR-1005"].map((item) => (
            <button key={item} onClick={() => setMessage(item)}>{item}</button>
          ))}
        </div>
      </section>
      {response && (
        <section className="panel">
          <h3>Answer</h3>
          <p>{response.answer}</p>
          <div className="meta-row">
            <span>Confidence: {response.confidence}%</span>
            <span>Matching IDs: {response.matchingCaseIds.join(", ") || "None"}</span>
          </div>
          <ul className="action-list">{response.suggestedNextActions.map((item) => <li key={item}>{item}</li>)}</ul>
          <CaseTable cases={(response.matches || []).map((item) => item.case || item)} onPick={(id) => { setSelectedCase(id); setPage("reports"); }} />
        </section>
      )}
    </>
  );
}

function FirPage() {
  const [text, setText] = useState(sampleFir);
  const [analysis, setAnalysis] = useState(null);

  async function analyze() {
    setAnalysis(await api.analyzeFir(text));
  }

  function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then(setText);
  }

  return (
    <>
      <PageHeader icon={Upload} title="FIR Upload and Summarization" subtitle="Paste or upload FIR text to extract operational entities." />
      <section className="panel">
        <input type="file" accept=".txt,.md" onChange={upload} />
        <textarea className="fir-box" value={text} onChange={(event) => setText(event.target.value)} />
        <button className="primary" onClick={analyze}>Analyze FIR</button>
      </section>
      {analysis && (
        <section className="panel result-grid">
          {Object.entries(analysis).map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong>{Array.isArray(value) ? value.join(", ") || "-" : String(value || "-")}</strong>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function SimilarPage({ cases, selectedCase, setSelectedCase }) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (selectedCase) api.similar(selectedCase).then(setResult).catch(() => setResult(null));
  }, [selectedCase]);
  return (
    <>
      <PageHeader icon={FileSearch} title="Similar Case Detection" subtitle="Keyword, entity, location, and crime-type matching." />
      <section className="panel controls-row">
        <select value={selectedCase} onChange={(event) => setSelectedCase(event.target.value)}>
          {cases.map((item) => <option key={item.id}>{item.id}</option>)}
        </select>
      </section>
      <section className="match-grid">
        {(result?.matches || []).map((item) => (
          <article className="match-card" key={item.caseId}>
            <strong>{item.caseId}</strong>
            <span>{item.percentage}% similarity</span>
            <p>{item.reason}</p>
          </article>
        ))}
      </section>
    </>
  );
}

function GraphPage({ cases, selectedCase, setSelectedCase }) {
  const [graph, setGraph] = useState(null);
  useEffect(() => {
    if (selectedCase) api.graph(selectedCase).then(setGraph).catch(() => setGraph(null));
  }, [selectedCase]);
  const nodes = useMemo(() => (graph?.nodes || []).map((node, index) => {
    const angle = (index / Math.max(1, graph.nodes.length)) * Math.PI * 2;
    const radius = node.type === "case" ? 0 : 210;
    return {
      id: node.id,
      data: { label: `${node.label}\n${node.type}` },
      position: { x: 360 + Math.cos(angle) * radius, y: 250 + Math.sin(angle) * radius },
      className: `flow-${node.type}`
    };
  }), [graph]);
  const edges = useMemo(() => (graph?.edges || []).map((edge) => ({ id: edge.id, source: edge.source, target: edge.target, label: edge.label, animated: true })), [graph]);
  return (
    <>
      <PageHeader icon={GitBranch} title="Crime Relationship Graph" subtitle="Visual links across cases, suspects, victims, phones, UPI IDs, vehicles, banks, and locations." />
      <section className="panel controls-row">
        <select value={selectedCase} onChange={(event) => setSelectedCase(event.target.value)}>
          {cases.map((item) => <option key={item.id}>{item.id}</option>)}
        </select>
      </section>
      <section className="graph-panel">
        <ReactFlow nodes={nodes} edges={edges} fitView>
          <Background />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </section>
    </>
  );
}

function ReportsPage({ cases, selectedCase, setSelectedCase }) {
  const [report, setReport] = useState(null);
  async function generate() {
    setReport(await api.report(selectedCase));
  }
  function download() {
    const blob = new Blob([report.exportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.caseId}-investigation-report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <PageHeader icon={BarChart3} title="Investigation Report" subtitle="Generate structured lead packets with related cases and next steps." />
      <section className="panel controls-row">
        <select value={selectedCase} onChange={(event) => setSelectedCase(event.target.value)}>
          {cases.map((item) => <option key={item.id}>{item.id}</option>)}
        </select>
        <button className="primary" onClick={generate}>Generate</button>
        {report && <button className="secondary" onClick={download}><Download size={16} /> Export</button>}
      </section>
      {report && (
        <section className="panel report">
          <h3>{report.caseId}</h3>
          <p>{report.caseSummary}</p>
          <strong>Risk score: {report.riskScore}</strong>
          <h4>Key entities</h4>
          <pre>{JSON.stringify(report.keyEntities, null, 2)}</pre>
          <h4>Related cases</h4>
          <ul>{report.relatedCases.map((item) => <li key={item.caseId}>{item.caseId} - {item.percentage}% - {item.reason}</li>)}</ul>
          <h4>Suggested investigation steps</h4>
          <ul>{report.suggestedInvestigationSteps.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      )}
    </>
  );
}

function AdminPage({ cases, refreshCases }) {
  const [form, setForm] = useState({ title: "Fictional new cyber fraud lead", crimeType: "Cyber fraud", city: "Bengaluru", location: "Demo locality", amount: 25000, riskLevel: "Medium", status: "Pending" });
  const [editing, setEditing] = useState("");

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const payload = { ...form, amount: Number(form.amount || 0), keywords: String(form.crimeType).toLowerCase().split(/\s+/), entities: { phones: [], upiIds: [], bankAccounts: [], vehicles: [], locations: [form.location, form.city] } };
    if (editing) await api.updateCase(editing, payload);
    else await api.createCase(payload);
    setEditing("");
    await refreshCases();
  }

  async function remove(id) {
    await api.deleteCase(id);
    await refreshCases();
  }

  return (
    <>
      <PageHeader icon={Users} title="Admin Data Management" subtitle="Add, edit, delete, and view mock crime records." />
      <section className="panel admin-form">
        {["title", "crimeType", "city", "location", "status", "riskLevel", "amount"].map((key) => (
          <label key={key}>
            {key}
            <input value={form[key] || ""} onChange={(event) => setField(key, event.target.value)} />
          </label>
        ))}
        <button className="primary" onClick={save}><Plus size={16} /> {editing ? "Update case" : "Add mock case"}</button>
      </section>
      <section className="panel">
        <div className="admin-list">
          {cases.map((item) => (
            <div key={item.id}>
              <span><strong>{item.id}</strong> {item.title}</span>
              <button onClick={() => { setEditing(item.id); setForm(item); }}>Edit</button>
              <button className="danger" onClick={() => remove(item.id)}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default App;
