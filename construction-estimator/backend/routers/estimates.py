from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from database import get_db
from models import Project, Estimate, Material

router = APIRouter()

# Pricing formula: Unit Price = Material Price × 1.30 × 1.12
PROFIT_RATE = 0.30
VAT_RATE    = 0.12


def apply_markup(material_price: float) -> float:
    """Material Price × (1 + Profit) × (1 + VAT)"""
    return round(material_price * (1 + PROFIT_RATE) * (1 + VAT_RATE), 2)


class EstimateItemCreate(BaseModel):
    material_id: Optional[int] = None
    item_name: str
    category: Optional[str] = None
    discipline: Optional[str] = "Plumbing"
    size: Optional[str] = None
    unit: Optional[str] = None
    quantity: float
    unit_price: float
    material_price: Optional[float] = None
    notes: Optional[str] = None


class EstimateItemResponse(BaseModel):
    id: int
    project_id: int
    material_id: Optional[int] = None
    item_name: str
    category: Optional[str] = None
    discipline: Optional[str] = None
    size: Optional[str] = None
    unit: Optional[str] = None
    quantity: float
    material_price: Optional[float] = None
    unit_price: float
    total_cost: float
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class AutoGenRequest(BaseModel):
    material_quantities: List[Dict[str, Any]]
    discipline: Optional[str] = "Plumbing"


@router.get("/{project_id}", response_model=List[EstimateItemResponse])
def get_estimate(project_id: int, db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(404, "Project not found")
    return db.query(Estimate).filter(Estimate.project_id == project_id).all()


@router.post("/{project_id}/items", response_model=EstimateItemResponse)
def add_item(project_id: int, body: EstimateItemCreate, db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(404, "Project not found")
    total = body.quantity * body.unit_price
    data  = body.model_dump()
    item  = Estimate(project_id=project_id, total_cost=total, **data)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{project_id}/items/{item_id}", response_model=EstimateItemResponse)
def update_item(
    project_id: int, item_id: int,
    body: EstimateItemCreate, db: Session = Depends(get_db)
):
    item = db.query(Estimate).filter(
        Estimate.id == item_id, Estimate.project_id == project_id
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for k, v in body.model_dump().items():
        setattr(item, k, v)
    item.total_cost = body.quantity * body.unit_price
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{project_id}/items/{item_id}")
def delete_item(project_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.query(Estimate).filter(
        Estimate.id == item_id, Estimate.project_id == project_id
    ).first()
    if not item:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Deleted"}


@router.post("/{project_id}/auto-generate")
def auto_generate(project_id: int, req: AutoGenRequest, db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == project_id).first():
        raise HTTPException(404, "Project not found")

    discipline = req.discipline or "Plumbing"

    # Remove existing items for this discipline
    db.query(Estimate).filter(
        Estimate.project_id == project_id,
        Estimate.discipline == discipline,
    ).delete()

    total_cost = 0.0
    count = 0

    for m in req.material_quantities:
        name = m.get("material", "")
        size = m.get("size", "")
        qty  = float(m.get("quantity", 0))

        # Exact match then fuzzy
        mat = (
            db.query(Material)
            .filter(Material.name == name, Material.size == size, Material.is_active == True)
            .first()
        ) or (
            db.query(Material)
            .filter(Material.name.ilike(f"%{name.split()[0]}%"), Material.is_active == True)
            .first()
        )

        material_price = mat.price if mat else 0.0
        unit_price     = apply_markup(material_price) if material_price else 0.0
        item_total     = qty * unit_price
        total_cost    += item_total

        db.add(Estimate(
            project_id    = project_id,
            material_id   = mat.id if mat else None,
            item_name     = name,
            category      = m.get("category"),
            discipline    = discipline,
            size          = size,
            unit          = m.get("unit"),
            quantity      = qty,
            material_price= material_price,
            unit_price    = unit_price,
            total_cost    = item_total,
            notes         = m.get("notes"),
        ))
        count += 1

    db.commit()
    return {"items_created": count, "total_cost": total_cost, "discipline": discipline}


@router.get("/{project_id}/summary")
def estimate_summary(project_id: int, db: Session = Depends(get_db)):
    items = db.query(Estimate).filter(Estimate.project_id == project_id).all()

    by_cat: Dict[str, float] = {}
    by_discipline: Dict[str, float] = {}
    for e in items:
        cat  = e.category or "Other"
        disc = e.discipline or "Plumbing"
        by_cat[cat]  = by_cat.get(cat, 0)  + (e.total_cost or 0)
        by_discipline[disc] = by_discipline.get(disc, 0) + (e.total_cost or 0)

    mat_cost = sum(v for k, v in by_cat.items() if k != "Labor")
    lab_cost = by_cat.get("Labor", 0)

    return {
        "material_cost":   mat_cost,
        "labor_cost":      lab_cost,
        "grand_total":     mat_cost + lab_cost,
        "by_category":     by_cat,
        "by_discipline":   by_discipline,
        "item_count":      len(items),
    }
