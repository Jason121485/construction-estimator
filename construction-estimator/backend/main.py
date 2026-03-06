import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routers import projects, materials, calculations, estimates, reports
from routers import electrical, structural, solar
from routers import auth
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
# allow_origin_regex covers production + all deploy-preview subdomains on Netlify
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    create_tables()
    seed_database()


# ── Auth ──────────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

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
