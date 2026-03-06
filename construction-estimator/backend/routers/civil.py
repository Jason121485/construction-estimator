"""
Civil Engineering Calculation Router.
Supports: cut/fill, trench, road pavement, drainage, water/sewer pipeline.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any

from database import get_db
from models import CivilCalculation, Estimate, Material
from civil_engine import run_civil_calculation
from auth_utils import require_active_subscription, get_project_or_404

router = APIRouter()

PROFIT_RATE = 0.30
VAT_RATE    = 0.12


def apply_markup(material_price: float) -> float:
    return round(material_price * (1 + PROFIT_RATE) * (1 + VAT_RATE), 2)


def _lookup_price(db: Session, name: str) -> float:
    mat = db.query(Material).filter(
        Material.name.ilike(f"%{name.split()[0]}%"),
        Material.is_active == True,
    ).first()
    return mat.price if mat else 0.0


class CivilAnalyzeRequest(BaseModel):
    calc_type: str
    inputs: dict[str, Any]


class CivilSaveRequest(BaseModel):
    calc_type: str
    inputs: dict[str, Any]


@router.post("/analyze")
def analyze(body: CivilAnalyzeRequest):
    """Run a civil calculation and return results without saving."""
    try:
        result = run_civil_calculation(body.calc_type, body.inputs)
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, str(exc))
    return result


@router.post("/{project_id}/save")
def save_and_generate(
    project_id: int,
    body: CivilSaveRequest,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """Save civil calculation and auto-generate Civil estimate line items."""
    get_project_or_404(project_id, user, db)

    try:
        result = run_civil_calculation(body.calc_type, body.inputs)
    except (ValueError, TypeError) as exc:
        raise HTTPException(400, str(exc))

    # Save calculation record
    calc = CivilCalculation(
        project_id=project_id,
        calc_type=body.calc_type,
        inputs=body.inputs,
        results=result,
    )
    db.add(calc)

    # Remove existing Civil estimates for this project
    db.query(Estimate).filter(
        Estimate.project_id == project_id,
        Estimate.discipline == "Civil",
    ).delete()

    # Generate BOQ from material_quantities
    count = 0
    for item in result.get("material_quantities", []):
        mat_price = _lookup_price(db, item["name"])
        unit_price = apply_markup(mat_price) if mat_price > 0 else 0.0
        total_cost = round(item["quantity"] * unit_price, 2)

        estimate = Estimate(
            project_id=project_id,
            item_name=item["name"],
            category="Civil Works",
            discipline="Civil",
            unit=item.get("unit", ""),
            quantity=item["quantity"],
            material_price=mat_price,
            unit_price=unit_price,
            total_cost=total_cost,
        )
        db.add(estimate)
        count += 1

    db.commit()
    return {"saved": True, "items_generated": count, "result": result}


@router.get("/{project_id}/latest")
def get_latest(
    project_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """Fetch the most recent civil calculation for a project."""
    get_project_or_404(project_id, user, db)
    calc = db.query(CivilCalculation).filter(
        CivilCalculation.project_id == project_id
    ).order_by(CivilCalculation.created_at.desc()).first()

    if not calc:
        return None

    return {
        "id": calc.id,
        "calc_type": calc.calc_type,
        "inputs": calc.inputs,
        "results": calc.results,
        "created_at": calc.created_at.isoformat() if calc.created_at else None,
    }
