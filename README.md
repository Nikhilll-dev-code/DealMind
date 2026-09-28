# DealMind — B2B Negotiation Intelligence

> **Turn past negotiations into your next best move.**  
> DealMind recalls your organization's closed deal experience—stored in **Hindsight long-term memory**—to recommend evidence-grounded pricing strategies, calculate deterministic concession economics, and retain new deal outcomes.

---

## Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React + Vite Frontend   │
                          │   (Tailwind CSS, Lucide)  │
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
```

- **Hindsight Long-Term Memory**: Stores and recalls historical deal episodes by customer and segment to determine win/loss patterns.
- **Deterministic Confidence & Conflict Rules**: Evaluates sample sizes (LOW / MEDIUM / HIGH) and detects customer vs. segment discount divergence.
- **Concession Economics Engine**: Calculates dynamic pricing, requested vs. proposed discount values, and concession retention.
- **Groq LLM Synthesis**: Generates conversational recommendation briefings (with fallback to deterministic reasoning).

---

## Quick Start

### 1. Prerequisites
- **Node.js** v18+ installed

### 2. Installation
Install dependencies for both client and server:
```bash
npm install --prefix server
npm install --prefix client
```

### 3. Environment Variables (Optional)
Copy the template to create your `.env` file in `server/`:
```bash
cp server/.env.example server/.env
```
*(DealMind operates out-of-the-box in local memory mode using SQLite if API keys are omitted).*

### 4. Running the Application

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

## Running Tests

Run the backend unit tests:
```bash
npm run test:server
```

Run the frontend production build:
```bash
npm run build:client
```

---

## Key Features

1. **New Negotiation Intake**: Enter custom deals with customer name, deal value, discount %, objections, and competitor pressure.
2. **Unified Deal Workspace**: Access Overview, Strategy Lab (3 packages), What-If Simulator, Counteroffer Advisor, Evidence Bank, and Customer Profiles under a single active deal.
3. **60-Second Guided Demo**: Interactive 6-step walkthrough demonstrating the full lifecycle from intake to Hindsight outcome retention.
4. **Learning Timeline**: Real-time record of organizational memory updates as deals are closed and retained.
