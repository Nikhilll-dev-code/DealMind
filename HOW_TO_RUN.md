# 🚀 DealMind 3.0 — Quick Start Guide for Teammates

Welcome to **DealMind 3.0**! Follow these simple steps to get the complete project running on your local machine in under 2 minutes.

---

## 📋 Prerequisites
- **Node.js**: Version 18+ or 20+ installed ([Download Node.js](https://nodejs.org/))
- **npm**: Included with Node.js

---

## ⚡ 1-Step Quick Setup

Open a terminal in the extracted folder and run:

### 1. Install Dependencies
```bash
# Install root, server, and client dependencies
npm install
npm install --prefix server
npm install --prefix client
```

### 2. Configure Environment Variables
Copy the example environment file in the `server` folder:
```bash
# On Windows (PowerShell):
cp server/.env.example server/.env

# Or on Mac / Linux:
cp server/.env.example server/.env
```
*(Optional: Add your `GROQ_API_KEY` and `HINDSIGHT_API_KEY` to `server/.env`. If omitted, DealMind operates automatically using local fallback and deterministic reasoning).*

---

## 🏃‍♂️ Running the Application

Open two terminal tabs:

### Terminal 1 — Start Backend Server (Port 5000)
```bash
npm run start:server
```

### Terminal 2 — Start Frontend Client (Port 3000)
```bash
npm run start:client
```

Now open your browser at:
👉 **`http://localhost:3000`** *(or `http://localhost:3001` if 3000 is occupied)*

---

## 🔑 Login Credentials (Pre-Seeded)

| Role | Email | Password | What to Test |
| :--- | :--- | :--- | :--- |
| **Sales Representative** | `sales@dealmind.local` | `Password123!` | Deal Intake, Give-Get playbooks, What-If Simulator, Counteroffers, Recording Outcomes |
| **Administrator** | `admin@dealmind.local` | `Password123!` | Dataset Clean Sync Upload, Guardrails, Discount Approvals, Commercial Intelligence Analytics |

*💡 Tip: You can switch between Sales Rep and Admin with 1 click using the top-right profile avatar.*

---

## 🧪 Testing with New Data & Resetting

1. Log in as **Administrator** (`admin@dealmind.local`).
2. Go to **Dataset Management** (`/admin/dataset`).
3. Click **"Sample CSV"** (or upload `sample_new_deals.csv` located in the project root folder).
4. Click **Validate & preview** $\rightarrow$ **Import dataset** (with *Replace all existing deals* checked).
5. Switch to **Sales Representative** to experience deal intelligence with your new dataset!
6. **Want to go back to original demo data?** In **Dataset Management**, click **"Reset to Demo Data (Acme Corp)"** at any time to restore the canonical 12-deal dataset.

---

## 🛠️ Running Automated Tests
```bash
npm run test:server
```
Runs the complete 46-test unit & integration test suite verifying economics, guardrails, outbox, and Hindsight memory flows.

---

## 📦 Building for Production
```bash
npm run build:client
```
