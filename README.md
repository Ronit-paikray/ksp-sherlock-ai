# KSP Sherlock AI - Crime Intelligence Copilot

**Slogan:** Transforming Crime Records into Actionable Intelligence  
**Challenge:** Challenge 1 - Intelligent Conversational AI for the KSP Crime Database  
**Owner:** Ronit Paikray

KSP Sherlock AI is a Datathon 2026 MVP that helps police officers search, summarize, analyze, and connect fictional crime records through a conversational investigation interface.

## Prototype Notice

This is a demonstration MVP using fictional mock data only. It does not contain real citizen, police, bank, phone, or law-enforcement data. Do not use it as a production policing system without formal security, privacy, legal, and operational review.

## Features

- Landing page, mock officer login, multilingual UI labels in English, Kannada, and Hindi
- Dashboard with case counts, pending/solved status, cybercrime totals, high-risk alerts, and recent activity
- AI crime search chat for natural-language investigation queries
- FIR paste/upload analysis with entity extraction, summary, timeline, and risk scoring
- Similar case detection using crime type, keywords, location, and shared entities
- Relationship graph for cases, suspects, victims, phones, UPI IDs, vehicles, banks, and locations
- Investigation report generation with downloadable text export
- Admin panel for viewing, adding, editing, and deleting mock records
- Catalyst-compatible Advanced I/O function structure

## Tech Stack

- React + Vite
- Express.js Advanced I/O style backend
- JSON mock storage
- React Flow for relationship graph visualization
- Browser Speech Recognition API for voice queries when supported

## Folder Structure

```text
.
├── functions/sherlock_api/       # Catalyst Advanced I/O Express function
│   ├── data/cases.json           # Fictional crime records
│   ├── catalyst-config.json
│   └── index.js
├── server/index.js               # Local API runner
├── src/                          # React application
├── scripts/                      # Build helpers
├── tests/                        # Node API tests
├── catalyst.json                 # Catalyst deploy configuration
├── .env.example
└── README.md
```

## Local Setup

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

API server:

```text
http://localhost:4000
```

## Environment Variables

Copy `.env.example` to `.env` for local development if needed. Keep real credentials outside Git.

```bash
PORT=4000
VITE_API_BASE=
```

For Catalyst direct function URLs, build with:

```bash
VITE_API_BASE=/server/sherlock_api npm run build
```

## Demo Credentials

Use any of these mock credentials:

| Officer ID | Password | Role |
| --- | --- | --- |
| KSP-INV-101 | demo123 | Investigator |
| KSP-ANL-202 | demo123 | Analyst |
| KSP-ADM-303 | demo123 | Admin |

## API Routes

- `GET /api/cases`
- `GET /api/cases/:id`
- `POST /api/chat`
- `POST /api/fir/analyze`
- `POST /api/cases/similar`
- `GET /api/graph/:caseId`
- `POST /api/report/generate`
- `POST /api/cases`
- `PUT /api/cases/:id`
- `DELETE /api/cases/:id`

## Testing

```bash
npm test
npm run build
```

## Catalyst Deployment Steps

The project includes `catalyst.json` and an Advanced I/O function folder. Catalyst CLI was not available in this environment, so deploy from a machine where you can securely sign in.

```bash
npm install
npm run build
npm install -g zcatalyst-cli
catalyst login
catalyst init
catalyst deploy
```

If API requests fail from the hosted client, set `VITE_API_BASE=/server/sherlock_api` before `npm run build`, or configure Catalyst API Gateway to route `/api/*` to the `sherlock_api` Advanced I/O function.

## GitHub Submission Steps

If GitHub CLI is installed and authenticated:

```bash
git init
git add .
git commit -m "Build KSP Sherlock AI MVP"
gh repo create ksp-sherlock-ai --public --source=. --remote=origin --push
```

Without GitHub CLI:

```bash
git remote add origin https://github.com/<your-username>/ksp-sherlock-ai.git
git push -u origin master
```

## Demo Video Script

1. Open the landing page and introduce the Datathon challenge.
2. Log in with `KSP-INV-101 / demo123`.
3. Show dashboard metrics and recent high-risk alerts.
4. Ask: "Show UPI fraud cases above 50000".
5. Ask: "Find cases similar to FIR-1023".
6. Paste a sample FIR and show entity extraction.
7. Open Similar Cases and compare `FIR-1023`.
8. Open Relationship Graph and explain shared phones, UPI IDs, vehicles, suspects, and locations.
9. Generate and download an investigation report.
10. Open Admin Panel and add a fictional case.

## Future Roadmap

- Replace mock storage with Catalyst Data Store or a governed crime database connector
- Add role-based access control using Catalyst Authentication
- Integrate an approved LLM with audited prompts and redaction
- Add geospatial heatmaps, officer workflows, and case assignment queues
- Add evidence upload, audit logs, and supervisory approvals
