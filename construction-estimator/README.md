# Construction & Plumbing Estimator

A full-stack web application that replaces Excel-based plumbing calculation and cost estimation spreadsheets.

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Project overview with cost charts |
| **Projects** | Create and manage construction projects |
| **Plumbing Calculator** | Hunter's Method fixture analysis → pipe sizing → material quantities |
| **Material Database** | 80+ Philippine-priced materials; inline price editing |
| **Cost Estimator** | BOQ with auto-pricing from the material database |
| **Reports** | PDF BOQ and Engineering Report download |
| **Admin Panel** | Full CRUD, bulk price adjustment by category |

## Engineering Calculations

- **WSFU** — Water Supply Fixture Units per PPC/ASPE
- **Hunter's Curve** — Peak flow rate interpolation (GPM → LPS)
- **Pipe Sizing** — Hazen-Williams with standard nominal diameters (15–200 mm)
- **Velocity Check** — Flags sections outside 0.6–3.0 m/s
- **Head Loss** — Hazen-Williams for PPR, PVC, GI, Copper, HDPE
- **Material Quantities** — Automated from floor count, fixture count, and pipe sizing
- **Daily Demand** — 150 L/person/day (Philippine Plumbing Code)

## Tech Stack

| Layer    | Technology            |
|----------|-----------------------|
| Frontend | React 18 + Vite + TailwindCSS + Recharts |
| Backend  | Python FastAPI + SQLAlchemy |
| Database | SQLite (zero-config) |
| PDF      | ReportLab |

## Quick Start

### 1. Start the Backend

Double-click **`start-backend.bat`** or run:

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend: http://localhost:8000
API Docs: http://localhost:8000/docs

### 2. Start the Frontend

Double-click **`start-frontend.bat`** or run:

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Project Structure

```
construction-estimator/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── database.py              # SQLite / SQLAlchemy setup
│   ├── models.py                # ORM models
│   ├── calculation_engine.py    # All engineering calculations
│   ├── pdf_generator.py         # BOQ + Engineering PDF
│   ├── seed_data.py             # Initial 80+ material prices
│   ├── requirements.txt
│   └── routers/
│       ├── projects.py
│       ├── materials.py
│       ├── calculations.py
│       ├── estimates.py
│       └── reports.py
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── PlumbingCalculator.jsx
│   │   │   ├── MaterialDatabase.jsx
│   │   │   ├── CostEstimator.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── AdminPanel.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx
│   │   │   └── Sidebar.jsx
│   │   └── utils/api.js
│   ├── package.json
│   └── vite.config.js
├── start-backend.bat
├── start-frontend.bat
└── README.md
```

## Typical Workflow

1. **Create a project** → set building type, floors, tank capacity
2. **Run Plumbing Calculator** → enter fixture counts, click "Run Analysis"
3. **Save to project** → auto-generates BOQ with DB prices
4. **Review in Cost Estimator** → edit quantities/prices manually if needed
5. **Download PDF** → BOQ or full Engineering Report
6. **Update prices** → Admin Panel or Material Database (hover → pencil icon)

## Price Reference

Material prices seeded from **TheProjectEstimate.com** in Philippine Peso (₱).
Use the Admin Panel → Bulk Price Adjustment to apply market inflation by category.

## Requirements

- Python 3.9+
- Node.js 18+
- npm 9+
