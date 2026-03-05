from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from database import get_db
from models import Project, Estimate, ElectricalCalculation
from electrical_engine import perform_electrical_analysis, DEMAND_FACTOR_TABLE, WIRE_SIZES_MM2, BREAKER_SIZES

router = APIRouter()

PROFIT_RATE = 0.30
VAT_RATE    = 0.12


def apply_markup(material_price: float) -> float:
    """Unit Price = Material Price × 1.30 × 1.12"""
    return round(material_price * (1 + PROFIT_RATE) * (1 + VAT_RATE), 2)


# ── Schemas ──────────────────────────────────────────────────────────────────

class CircuitInput(BaseModel):
    name: str
    load_type: str = "General"
    quantity: int = 1
    watts_per_unit: float
    demand_factor: Optional[float] = None
    cable_length_m: float = 30.0


class ElectricalAnalysisRequest(BaseModel):
    circuits: List[CircuitInput]
    supply_phase: str = "single"           # "single" | "three"
    power_factor: float = 0.85
    supply_voltage: float = 220.0
    cable_length_m: float = 30.0           # default run length for circuits
    critical_load_pct: float = 0.60
    diversity_factor: float = 0.80
    building_type: str = "Residential"


class SaveElectricalRequest(BaseModel):
    project_id: int
    circuits: List[CircuitInput]
    supply_phase: str = "single"
    power_factor: float = 0.85
    supply_voltage: float = 220.0


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/constants")
def get_constants():
    return {
        "demand_factors":   DEMAND_FACTOR_TABLE,
        "wire_sizes_mm2":   WIRE_SIZES_MM2,
        "breaker_sizes":    BREAKER_SIZES,
        "load_types":       list(DEMAND_FACTOR_TABLE.keys()),
    }


@router.post("/analyze")
def analyze(req: ElectricalAnalysisRequest):
    circuits_raw = [c.model_dump() for c in req.circuits]
    result = perform_electrical_analysis(
        circuits        = circuits_raw,
        supply_phase    = req.supply_phase,
        power_factor    = req.power_factor,
        supply_voltage  = req.supply_voltage,
        cable_length_m  = req.cable_length_m,
        critical_load_pct = req.critical_load_pct,
        diversity_factor  = req.diversity_factor,
        building_type   = req.building_type,
    )
    return result


@router.post("/{project_id}/save")
def save_and_generate_boq(
    project_id: int,
    req: SaveElectricalRequest,
    db: Session = Depends(get_db),
):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(404, "Project not found")

    circuits_raw = [c.model_dump() for c in req.circuits]
    result = perform_electrical_analysis(
        circuits        = circuits_raw,
        supply_phase    = req.supply_phase,
        power_factor    = req.power_factor,
        supply_voltage  = req.supply_voltage,
    )

    # Save calculation record
    calc = ElectricalCalculation(
        project_id    = project_id,
        circuits      = circuits_raw,
        results       = result,
        supply_phase  = req.supply_phase,
        power_factor  = req.power_factor,
        supply_voltage= req.supply_voltage,
    )
    db.add(calc)

    # Auto-generate BOQ items (electrical discipline)
    db.query(Estimate).filter(
        Estimate.project_id == project_id,
        Estimate.discipline == "Electrical",
    ).delete()

    count = 0
    for m in result.get("material_quantities", []):
        material_price = _lookup_material_price(db, m["material"], m.get("size", ""))
        unit_price     = apply_markup(material_price) if material_price else 0.0
        total          = float(m.get("quantity", 0)) * unit_price
        db.add(Estimate(
            project_id     = project_id,
            item_name      = m["material"],
            category       = m["category"],
            discipline     = "Electrical",
            size           = m.get("size", ""),
            unit           = m.get("unit", ""),
            quantity       = float(m.get("quantity", 0)),
            material_price = material_price,
            unit_price     = unit_price,
            total_cost     = total,
            notes          = m.get("notes", ""),
        ))
        count += 1

    db.commit()
    return {"saved": True, "items_created": count, "result": result}


@router.get("/{project_id}/latest")
def get_latest(project_id: int, db: Session = Depends(get_db)):
    calc = (
        db.query(ElectricalCalculation)
        .filter(ElectricalCalculation.project_id == project_id)
        .order_by(ElectricalCalculation.created_at.desc())
        .first()
    )
    if not calc:
        raise HTTPException(404, "No electrical calculation found for this project")
    return calc.results


def _lookup_material_price(db: Session, name: str, size: str) -> float:
    from models import Material
    mat = (
        db.query(Material)
        .filter(Material.name == name, Material.size == size, Material.is_active == True)
        .first()
    ) or (
        db.query(Material)
        .filter(Material.name.ilike(f"%{name.split()[0]}%"), Material.is_active == True)
        .first()
    )
    return mat.price if mat else 0.0
