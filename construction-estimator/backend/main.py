import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import create_tables
from routers import projects, materials, calculations, estimates, reports
from routers import electrical, structural, solar
from routers import auth, billing
from routers import subcontractors, overhead, bid, civil
from seed_data import seed_database

app = FastAPI(
    title="Engineering Construction Estimator SaaS",
    version="2.0.0",
    description=(
        "Multi-discipline engineering SaaS: Electrical, Plumbing, "
        "Structural, and Solar estimation with automated BOQ generation."
    ),
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Note: requests through Netlify proxy are same-origin — no CORS needed there.
# Localhost entries are for local development only.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Return the real exception message so we can diagnose 500s."""
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)[:300]}"},
    )


@app.on_event("startup")
async def startup_event():
    create_tables()
    seed_database()


# ── Auth ──────────────────────────────────────────────────────────────────────
app.include_router(auth.router,    prefix="/api/auth",    tags=["Auth"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])

# ── Existing routers ──────────────────────────────────────────────────────────
app.include_router(projects.router,     prefix="/api/projects",     tags=["Projects"])
app.include_router(materials.router,    prefix="/api/materials",    tags=["Materials"])
app.include_router(calculations.router, prefix="/api/calculations", tags=["Plumbing"])
app.include_router(estimates.router,    prefix="/api/estimates",    tags=["Estimates"])
app.include_router(reports.router,      prefix="/api/reports",      tags=["Reports"])

# ── Discipline routers ────────────────────────────────────────────────────────
app.include_router(electrical.router, prefix="/api/electrical", tags=["Electrical"])
app.include_router(structural.router, prefix="/api/structural", tags=["Structural"])
app.include_router(solar.router,      prefix="/api/solar",      tags=["Solar"])
app.include_router(civil.router,      prefix="/api/civil",      tags=["Civil"])

# ── Professional estimating routers ───────────────────────────────────────────
app.include_router(subcontractors.router, prefix="/api/subcontractors", tags=["Subcontractors"])
app.include_router(overhead.router,       prefix="/api/overhead",       tags=["Overhead"])
app.include_router(bid.router,            prefix="/api/bid",            tags=["Bid"])


@app.get("/")
def root():
    return {
        "message": "Engineering Construction Estimator API v2.0",
        "docs": "/docs",
        "disciplines": ["Electrical", "Plumbing", "Structural", "Solar"],
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
