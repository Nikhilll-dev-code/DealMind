# DealMind 3.0 — B2B Negotiation Intelligence Platform

> **Turn your organization's past negotiations into your next best move.**

DealMind is an AI-powered B2B Negotiation Intelligence Platform that helps sales teams make evidence-backed decisions by combining **Hindsight long-term organizational memory**, **multi-model Groq LLM reasoning**, **deterministic economics calculations**, and **enterprise governance workflows**.

Every closed deal is remembered. Every future negotiation learns from it.

```
New Negotiation Created
        │
        ▼
Hindsight Memory Recall (customer-first evidence retrieval)
        │
        ▼
Groq AI Agent Analysis (3-model fallback router, token-budgeted)
        │
        ▼
Deterministic Economics Engine (concession math, give-get packages)
        │
        ▼
Manager Governance (approval escalation, RBAC, anti-self-approval)
        │
        ▼
Outcome Recorded → Retained in Hindsight → Future Deals Improve
```

---

## ✨ Core Features

| Feature | Description |
| :--- | :--- |
| 🧠 **Hindsight Organizational Memory** | Retains and recalls structured negotiation experiences — customer, objection, concession %, competitor pressure, outcome |
| 🤖 **Groq Multi-Model AI Router** | 3-model fallback chain (GPT-OSS 120B → Qwen 27B → GPT-OSS 20B) with per-model token budgeting and rate-limit classification (TPD / ITPM / OTPM / TPM / RPM) |
| 📊 **Deterministic Confidence Engine** | Mathematically calibrated win-rate evidence tiers (NONE / PRELIMINARY / EMERGING / ESTABLISHED) with automated conflict detection |
| 💰 **Concession Economics Engine** | Zero-hallucination financial math — requested vs proposed concession delta, COGS deduction, multi-year TCV |
| 🧪 **What-If Simulator** | Real-time scenario modeling: adjust discount %, contract term, and support bundles independently |
| 💬 **Counteroffer Advisor** | Evidence-grounded response scripts grounded in past customer-specific deals |
| 🧩 **Strategy Lab** | Conservative / Balanced / Aggressive strategy packages with full economics breakdown |
| 🔐 **RBAC & Governance** | Salesperson / Manager / Admin roles, mandatory decision notes, anti-self-approval, multi-tenant isolation |
| 📬 **Transactional Outbox** | Guaranteed SQLite-to-Hindsight delivery with exponential jitter retry and checkpoint replay |
| 📡 **SSE Live Streaming** | Real-time agent execution traces streamed to the frontend |
| 🎬 **60-Second Guided Demo** | Interactive 6-step walkthrough demonstrating the complete memory learning lifecycle |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               React 19 + Vite 6 Frontend                    │
│           (Tailwind CSS 3, Lucide React, SSE)               │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + SSE
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Node.js + Express API Server                  │
│         (JWT Auth, RBAC Middleware, Rate Limiting)          │
└────────┬──────────────┬──────────────┬──────────────────────┘
         │              │              │
    ┌────▼─────┐  ┌─────▼─────┐  ┌───▼──────────┐
    │ Groq LLM │  │ Hindsight │  │ SQLite + WAL  │
    │  Router  │  │  Cloud    │  │  (Database)   │
    │ (3-model)│  │  Memory   │  │               │
    └──────────┘  └───────────┘  └───────────────┘
         │
    ┌────▼─────────────────────────────────────────┐
    │  Redis (optional) / In-Process Fallback       │
    │  Rate Limiting · Token Budgets · Concurrency  │
    └──────────────────────────────────────────────┘
```

**Backend Services:**
- `agentOrchestrator.js` — Autonomous tool-calling agent loop with compact serialization
- `groqAdapter.js` — Multi-model router, per-model token budgeting, OTPM/ITPM/TPD/TPM error classification
- `hindsightAdapter.js` — Cloud memory retain/recall/reflect with SQLite fallback
- `confidenceEngine.js` — Evidence tier calibration and conflict matrix
- `economicsEngine.js` — Deterministic concession math, strategy lab, give-get packages
- `approvalEngine.js` — RBAC governance, anti-self-approval, mandatory notes enforcement
- `checkpointManager.js` — Agent session state with idempotent replay
- `redisAdapter.js` — Distributed rate limiting, token budgets, concurrency slots

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+** and **npm**
- **Groq API Key** (free tier works) — [console.groq.com/keys](https://console.groq.com/keys)
- **Hindsight API Key** (optional) — [vectorize.io](https://vectorize.io) — without it, DealMind uses SQLite local memory

### 1. Clone & Install

```bash
git clone https://github.com/your-org/dealmind.git
cd dealmind
npm install --prefix server
npm install --prefix client
```

### 2. Configure Environment

```bash
# Windows
copy server\.env.example server\.env

# macOS / Linux
cp server/.env.example server/.env
```

Open `server/.env` and set your keys:

```env
PORT=5000
JWT_SECRET=your_secure_random_secret_at_least_32_chars
GROQ_API_KEY=gsk_...
HINDSIGHT_API_KEY=hsk_...    # optional
```

### 3. Run the Application

```bash
# Terminal 1 — Backend
npm run start:server

# Terminal 2 — Frontend
npm run start:client
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Demo Credentials (auto-seeded):**

| Role | Email | Password |
| :--- | :--- | :--- |
| Admin | `admin@dealmind.local` | `Password123!` |
| Manager | `manager@dealmind.local` | `Password123!` |
| Salesperson | `sales@dealmind.local` | `Password123!` |

### 4. Run Tests

```bash
npm run test:server
```

Expected: **46/46 tests pass**

### 5. Production Build

```bash
npm run build:client
```

---

## 🗂️ Project Structure

```
dealmind/
├── client/                    # React 19 + Vite 6 Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── WhatIfSimulator.jsx
│   │   │   ├── CounterofferAdvisor.jsx
│   │   │   ├── StrategyLab.jsx
│   │   │   ├── PrecedentLineage.jsx
│   │   │   ├── EvidenceConflictMatrix.jsx
│   │   │   └── GiveGetPanel.jsx
│   │   ├── views/             # Page-level views
│   │   │   ├── DealWorkspaceView.jsx
│   │   │   ├── ApprovalsView.jsx
│   │   │   ├── MemoryExplorerView.jsx
│   │   │   ├── LearningTimelineView.jsx
│   │   │   └── DemoView.jsx
│   │   ├── services/api.js    # API client
│   │   └── context/           # Auth + Toast context
│   └── package.json
│
├── server/                    # Node.js + Express Backend
│   ├── src/
│   │   ├── services/
│   │   │   ├── agentOrchestrator.js   # AI agent loop
│   │   │   ├── groqAdapter.js         # Multi-model router
│   │   │   ├── hindsightAdapter.js    # Memory layer
│   │   │   ├── confidenceEngine.js    # Evidence calibration
│   │   │   ├── economicsEngine.js     # Concession math
│   │   │   ├── approvalEngine.js      # RBAC governance
│   │   │   ├── patternEngine.js       # Behavioral patterns
│   │   │   └── redisAdapter.js        # Rate limiting
│   │   ├── db/database.js             # SQLite schema + seeding
│   │   ├── routes/api.js              # All API routes
│   │   ├── middleware/authMiddleware.js
│   │   ├── config/permissions.js      # RBAC constants
│   │   └── config.js                  # Environment config
│   ├── seed/negotiations.json         # 12 canonical demo deals
│   ├── data/                          # SQLite runtime (gitignored)
│   ├── test/server.test.js            # 46-test suite
│   ├── .env.example                   # Environment template
│   └── package.json
│
├── .gitignore
├── .env.example
├── package.json                       # Workspace root scripts
└── README.md
```

---

## 🧪 Test Suite

The backend ships with **46 automated tests** covering every major subsystem:

| Group | Tests |
| :--- | :--- |
| Confidence Engine & Evidence Tiers | 1–2 |
| Groq Error Classification & Cooldowns | 3–8 |
| Agent Analysis & Tool Calling | 4–6 |
| Hindsight Memory Recall & Retention | 9–10, 14, 23–25, 42 |
| Checkpoints & Session Replay | 11–12 |
| Approvals & RBAC | 13, 26–32, 43 |
| Redis & Concurrency | 16, 21 |
| Authentication & JWT | 17–18 |
| Idempotency & Outbox | 19–20, 34 |
| SSE Streaming | 22 |
| What-If Simulation | 35–36, 41 |
| Counteroffer Advisor | 37–38 |
| Customer Pattern Engine | 39–40 |
| Token Management & Context Compaction | 44–46 |

---

## 🔐 Security Notes

- All secrets are loaded via `server/.env` — **never committed to Git**
- JWT tokens are stateless and tenant-scoped
- Tenant isolation enforced at every database query level
- RBAC checked at both route middleware and service layer
- Salesperson role cannot view infrastructure telemetry, approve discounts, or manage outbox
- Manager cannot approve their own deals
- Health endpoint returns only `{ status: "ok" }` to unprivileged callers

---

## ⚙️ Environment Variables Reference

| Variable | Required | Description |
| :--- | :--- | :--- |
| `PORT` | No (default 5000) | Backend server port |
| `JWT_SECRET` | **Yes** | Minimum 32-char secret for JWT signing |
| `GROQ_API_KEY` | **Yes** | Groq Cloud API key for LLM reasoning |
| `HINDSIGHT_API_KEY` | No | Vectorize Hindsight key (omit for local-only mode) |
| `HINDSIGHT_BASE_URL` | No | Hindsight API base URL |
| `HINDSIGHT_BANK_ID` | No | Memory bank identifier |
| `REDIS_URL` | No | Redis connection URL (omit for in-process fallback) |
| `SQLITE_PATH` | No (default `./data/dealmind.sqlite`) | Database path |
| `JWT_EXPIRES_IN` | No (default `7d`) | Token expiry duration |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run tests to verify nothing is broken (`npm run test:server`)
4. Commit your changes (`git commit -m 'feat: describe your change'`)
5. Push to the branch (`git push origin feature/my-feature`)
6. Open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.
