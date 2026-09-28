# DealMind — B2B Negotiation Intelligence

> **Turn past negotiations into your next best move.**

DealMind is a negotiation intelligence platform that helps sales teams make winning decisions by combining **Hindsight long-term organizational memory, evidence-grounded reasoning, deterministic business rules, and LLM synthesis**.

Instead of treating every deal as a brand-new conversation, DealMind remembers what happened in previous negotiations — what worked, what failed, which concessions were made, and how similar negotiations ended.

```
Previous Deals ──► Hindsight Memory ──► Evidence Recall ──► Deterministic Economics ──► Recommendation
      ▲                                                                                        │
      └──────────────────────── Record Outcome & Retain in Memory ─────────────────────────────┘
```

---

## 💡 Why DealMind?

Most negotiation assistants analyze deals in isolation. DealMind answers the crucial question:

> *"What have we learned from our organization's past negotiations that should shape this deal?"*

- **Historical Evidence First**: Customer and segment deal memories are recalled before generating recommendations.
- **Deterministic Business Engine**: Financial math and confidence calculations are performed strictly via code rules, preventing LLM arithmetic hallucinations.
- **Continuous Learning Loop**: Every closed negotiation (WON/LOST) is retained in Hindsight, immediately informing future deal recommendations.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🧠 **Hindsight Long-Term Memory** | Retains structured deal experiences (deal value, objections, concession %, competitor pressure, outcomes). |
| 🎯 **Customer-Specific Intelligence** | Distinguishes between customer-specific and segment-level evidence to prioritize relevant historical track records. |
| 📊 **Deterministic Confidence Engine** | Calculates confidence mathematically (sample size & win rate) with automated conflict detection. |
| 💰 **Concession Economics Engine** | Quantifies potential concession savings (e.g. *"$12,000 less in discount concession compared with a 20% discount"*). |
| 🧪 **What-If Simulator** | Interactive scenario modeling adjusting discount %, contract years, and support bundles in real time. |
| 💬 **Counteroffer Advisor** | Generates evidence-backed response scripts when customers push back. |
| 🧩 **Strategy Lab** | Compares 3 distinct evidence-supported packages: Conservative, Balanced, and Aggressive. |
| 📈 **Learning Timeline** | Real-time visual timeline showing before/after confidence changes as outcomes are retained. |
| 🎬 **60-Second Guided Demo** | Complete 6-step interactive walkthrough demonstrating the end-to-end memory lifecycle. |

---

## 🏗️ Architecture

```
                          ┌───────────────────────────┐
                          │   React + Vite Frontend   │
                          │  (Tailwind CSS, Lucide)   │
                          └─────────────┬─────────────┘
                                        │ REST API
                                        ▼
                          ┌───────────────────────────┐
                          │   Express.js API Server   │
                          └──────┬─────────────┬──────┘
                                 │             │
                    ┌────────────▼─────┐ ┌─────▼───────────────┐
                    │ Hindsight Memory │ │ Deterministic Rules │
                    │   & Groq LLM     │ │ & Economics Engine  │
                    └──────────────────┘ └─────────────────────┘
                                 │
                          ┌──────▼──────┐
                          │ SQLite State│
                          └─────────────┘
```

- **SQLite**: Stores structured application records, seed data, and local cache.
- **Hindsight**: Provides persistent long-term organizational memory (`retain`, `recall`, `reflect`).
- **Groq LLM**: Synthesizes verified evidence into clean, human-readable sales briefings.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 18+** & **npm**

### 2. Installation
Install dependencies for both backend and frontend:
```bash
npm install --prefix server
npm install --prefix client
```

### 3. Environment Configuration (Optional)
Copy the environment template:
```bash
# Windows
copy server\.env.example server\.env

# macOS / Linux
cp server/.env.example server/.env
```

Configure credentials in `server/.env`:
```env
PORT=5000
GROQ_API_KEY=your_groq_api_key
HINDSIGHT_API_KEY=your_hindsight_api_key
HINDSIGHT_BANK_ID=dealmind
```
*(DealMind operates out-of-the-box in local memory mode using SQLite if API keys are omitted).*

---

## ▶️ Running the Application

In terminal 1 (Backend Server on Port 5000):
```bash
npm run start:server
```

In terminal 2 (Frontend Client on Port 3000):
```bash
npm run start:client
```

Open `http://localhost:3000` in your browser.

---

## 🧪 Testing & Verification

Run backend unit tests:
```bash
npm run test:server
```

Run frontend production build:
```bash
npm run build:client
```

---

## 🔌 API Reference

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server & integration health status |
| `POST` | `/api/negotiations/analyze` | Analyze deal with Hindsight memory recall |
| `GET` | `/api/negotiations` | Retrieve all historical negotiations |
| `POST` | `/api/negotiations/:id/outcome` | Record deal outcome & retain memory in Hindsight |
| `POST` | `/api/negotiations/:id/counteroffer` | Generate memory-grounded counteroffer script |
| `POST` | `/api/negotiations/:id/simulate` | Run live What-If scenario simulation |
| `GET` | `/api/customers/:id/history` | Retrieve customer negotiation profile |
| `GET` | `/api/learning/timeline` | Fetch organizational learning event history |
| `POST` | `/api/demo/reset` | Reset demo state to 12 seed episodes |
