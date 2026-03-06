from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from database import get_db
from models import Project, Estimate, SolarCalculation, User
from auth_utils import require_active_subscription, get_project_or_404
from solar_engine import (
    perform_solar_analysis, calc_load_analysis,
    PHILIPPINE_PSH, PANEL_WATTAGES,
    INVERTER_SIZES_KW, BATTERY_DOD, SYSTEM_TYPES,
)

router = APIRouter()

PROFIT_RATE = 0.30
VAT_RATE    = 0.12


def apply_markup(material_price: float) -> float:
    return round(material_price * (1 + PROFIT_RATE) * (1 + VAT_RATE), 2)


# ── Schemas ───────────────────────────────────────────────────────────────

class SolarAnalysisRequest(BaseModel):
    monthly_kwh: float
    location: str = "General (Luzon)"
    panel_wattage_wp: float = 400
    battery_type: str = "Lithium (LFP)"
    backup_hours: float = 4.0
    system_type: str = "grid_tied"
    roof_area_m2: Optional[float] = None


class SaveSolarRequest(BaseModel):
    project_id: int
    monthly_kwh: float = 0
    location: str = "General (Luzon)"
    panel_wattage_wp: float = 400
    battery_type: str = "Lithium (LFP)"
    backup_hours: float = 4.0
    system_type: str = "grid_tied"
    roof_area_m2: Optional[float] = None
    appliances: Optional[list] = None
    daily_load_wh: Optional[float] = None


class LoadAnalysisRequest(BaseModel):
    appliances: list   # [{name, qty, watts, hours_per_day, is_motor_load}]


# ── Routes ────────────────────────────────────────────────────────────────

@router.get("/constants")
def get_constants():
    return {
        "locations":       list(PHILIPPINE_PSH.keys()),
        "panel_wattages":  PANEL_WATTAGES,
        "inverter_sizes":  INVERTER_SIZES_KW,
        "battery_types":   list(BATTERY_DOD.keys()),
        "system_types":    SYSTEM_TYPES,
    }


@router.post("/load-analysis")
def load_analysis(req: LoadAnalysisRequest):
    """Compute daily load and surge load from appliance list."""
    return calc_load_analysis(req.appliances)


@router.post("/analyze")
def analyze(req: SolarAnalysisRequest):
    return perform_solar_analysis(
        monthly_kwh       = req.monthly_kwh,
        location          = req.location,
        panel_wattage_wp  = req.panel_wattage_wp,
        battery_type      = req.battery_type,
        backup_hours      = req.backup_hours,
        system_type       = req.system_type,
        roof_area_m2      = req.roof_area_m2,
    )


@router.post("/{project_id}/save")
def save_and_generate_boq(
    project_id: int,
    req: SaveSolarRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    proj = get_project_or_404(project_id, user, db)

    result = perform_solar_analysis(
        monthly_kwh       = req.monthly_kwh,
        location          = req.location,
        panel_wattage_wp  = req.panel_wattage_wp,
        battery_type      = req.battery_type,
        backup_hours      = req.backup_hours,
        system_type       = req.system_type,
        roof_area_m2      = req.roof_area_m2,
    )

    inputs_dict = req.model_dump(exclude={"project_id"})
    calc = SolarCalculation(
        project_id  = project_id,
        inputs      = inputs_dict,
        results     = result,
        system_type = req.system_type,
    )
    db.add(calc)

    db.query(Estimate).filter(
        Estimate.project_id == project_id,
        Estimate.discipline == "Solar",
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
            discipline     = "Solar",
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
def get_latest(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    calc = (
        db.query(SolarCalculation)
        .filter(SolarCalculation.project_id == project_id)
        .order_by(SolarCalculation.created_at.desc())
        .first()
    )
    if not calc:
        raise HTTPException(404, "No solar calculation found for this project")
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
