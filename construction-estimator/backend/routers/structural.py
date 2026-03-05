from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from database import get_db
from models import Project, Estimate, StructuralCalculation, User
from structural_engine import perform_structural_takeoff, CEMENT_BAGS_PER_M3
from auth_utils import require_active_subscription, get_project_or_404

router = APIRouter()

PROFIT_RATE = 0.30
VAT_RATE    = 0.12


def apply_markup(material_price: float) -> float:
    return round(material_price * (1 + PROFIT_RATE) * (1 + VAT_RATE), 2)


# ── Schemas ───────────────────────────────────────────────────────────────

class StructuralElement(BaseModel):
    type: str                         # slab | beam | column | footing | wall | stair
    label: Optional[str] = None
    quantity: int = 1
    # Dimension fields (all in meters)
    length_m: Optional[float] = None
    width_m:  Optional[float] = None
    depth_m:  Optional[float] = None
    height_m: Optional[float] = None
    thickness_m: Optional[float] = None
    floor_to_floor_m: Optional[float] = None


class StructuralRequest(BaseModel):
    elements: List[StructuralElement]
    concrete_class: str = "C25 (1:1:2)"
    rebar_grade: str = "Grade 60"


class SaveStructuralRequest(BaseModel):
    project_id: int
    elements: List[StructuralElement]
    concrete_class: str = "C25 (1:1:2)"
    rebar_grade: str = "Grade 60"


# ── Routes ────────────────────────────────────────────────────────────────

@router.get("/constants")
def get_constants():
    return {
        "element_types":   ["slab", "beam", "column", "footing", "wall", "stair"],
        "concrete_classes": list(CEMENT_BAGS_PER_M3.keys()),
        "rebar_grades":    ["Grade 40", "Grade 60", "Grade 75"],
    }


@router.post("/analyze")
def analyze(req: StructuralRequest):
    elements_raw = [e.model_dump(exclude_none=True) for e in req.elements]
    result = perform_structural_takeoff(
        elements       = elements_raw,
        concrete_class = req.concrete_class,
        rebar_grade    = req.rebar_grade,
    )
    return result


@router.post("/{project_id}/save")
def save_and_generate_boq(
    project_id: int,
    req: SaveStructuralRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    proj = get_project_or_404(project_id, user, db)

    elements_raw = [e.model_dump(exclude_none=True) for e in req.elements]
    result = perform_structural_takeoff(
        elements       = elements_raw,
        concrete_class = req.concrete_class,
        rebar_grade    = req.rebar_grade,
    )

    # Save calculation record
    calc = StructuralCalculation(
        project_id     = project_id,
        elements       = elements_raw,
        results        = result,
        concrete_class = req.concrete_class,
        rebar_grade    = req.rebar_grade,
    )
    db.add(calc)

    # Wipe previous structural estimates for this project
    db.query(Estimate).filter(
        Estimate.project_id == project_id,
        Estimate.discipline == "Structural",
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
            discipline     = "Structural",
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
        db.query(StructuralCalculation)
        .filter(StructuralCalculation.project_id == project_id)
        .order_by(StructuralCalculation.created_at.desc())
        .first()
    )
    if not calc:
        raise HTTPException(404, "No structural calculation found for this project")
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
