"""
Site Overhead / General Expenses Module.
Covers project-level overhead costs: supervision, temporary facilities, safety, etc.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import SiteOverheadItem
from auth_utils import require_active_subscription, get_project_or_404

router = APIRouter()

OVERHEAD_CATEGORIES = [
    "Supervision",
    "Temporary Facilities",
    "Temporary Utilities",
    "Safety Program",
    "Security",
    "Equipment Rental",
    "Site Logistics",
    "Permits & Fees",
    "Insurance & Bonds",
    "Miscellaneous",
]

# Default overhead items to seed for a new project
DEFAULT_OVERHEAD_ITEMS = [
    # Supervision
    ("Supervision", "Project Manager", "month", 0, 0),
    ("Supervision", "Site Engineer", "month", 0, 0),
    ("Supervision", "Project Foreman", "month", 0, 0),
    ("Supervision", "Safety Officer", "month", 0, 0),
    # Temporary Facilities
    ("Temporary Facilities", "Site Office (Containerized)", "month", 0, 0),
    ("Temporary Facilities", "Workers' Quarters / Bunkhouse", "month", 0, 0),
    ("Temporary Facilities", "Tool & Material Storage Shed", "month", 0, 0),
    ("Temporary Facilities", "Temporary Site Fencing (Chain Link)", "lot", 0, 0),
    # Temporary Utilities
    ("Temporary Utilities", "Temporary Power Connection (Meralco/Generator)", "month", 0, 0),
    ("Temporary Utilities", "Temporary Water Supply", "month", 0, 0),
    ("Temporary Utilities", "Communications / Internet", "month", 0, 0),
    # Safety Program
    ("Safety Program", "PPE (Helmets, Vests, Gloves, Boots)", "lot", 0, 0),
    ("Safety Program", "Safety Signages & Barriers", "lot", 0, 0),
    ("Safety Program", "First Aid Supplies & Safety Kit", "lot", 0, 0),
    ("Safety Program", "Safety Training & Orientation", "lot", 0, 0),
    # Security
    ("Security", "Security Guards", "month", 0, 0),
    # Equipment Rental
    ("Equipment Rental", "Scaffolding System", "month", 0, 0),
    ("Equipment Rental", "Concrete Mixer / Transit Mixer", "month", 0, 0),
    ("Equipment Rental", "Generator Set (Standby Power)", "month", 0, 0),
    # Site Logistics
    ("Site Logistics", "Material Hauling & Unloading", "lot", 0, 0),
    ("Site Logistics", "Waste Disposal & Clean-up", "lot", 0, 0),
    # Permits & Fees
    ("Permits & Fees", "Building Permit", "lot", 0, 0),
    ("Permits & Fees", "Other Government Fees & Licenses", "lot", 0, 0),
    # Insurance & Bonds
    ("Insurance & Bonds", "Contractor's All-Risk Insurance (CAR)", "lot", 0, 0),
    ("Insurance & Bonds", "Performance Bond", "lot", 0, 0),
    # Miscellaneous
    ("Miscellaneous", "Mobilization & Demobilization", "lot", 0, 0),
    ("Miscellaneous", "Contingency Allowance (Petty Cash)", "lot", 0, 0),
]


class OverheadItemCreate(BaseModel):
    category: str
    description: str
    unit: Optional[str] = None
    quantity: float = 0.0
    unit_cost: float = 0.0


class OverheadItemUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    unit_cost: Optional[float] = None


def _item_dict(item: SiteOverheadItem) -> dict:
    return {
        "id": item.id,
        "project_id": item.project_id,
        "category": item.category,
        "description": item.description,
        "unit": item.unit,
        "quantity": item.quantity,
        "unit_cost": item.unit_cost,
        "total_cost": item.total_cost,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("/{project_id}")
def list_items(
    project_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    get_project_or_404(project_id, user, db)
    items = db.query(SiteOverheadItem).filter(
        SiteOverheadItem.project_id == project_id
    ).order_by(SiteOverheadItem.category, SiteOverheadItem.id).all()
    return [_item_dict(i) for i in items]


@router.post("/{project_id}", status_code=201)
def add_item(
    project_id: int,
    body: OverheadItemCreate,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    get_project_or_404(project_id, user, db)
    total = round(body.quantity * body.unit_cost, 2)
    item = SiteOverheadItem(
        project_id=project_id,
        category=body.category,
        description=body.description,
        unit=body.unit,
        quantity=body.quantity,
        unit_cost=body.unit_cost,
        total_cost=total,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_dict(item)


@router.post("/{project_id}/seed", status_code=201)
def seed_overhead(
    project_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """Populate default overhead categories for a project (skips existing items)."""
    get_project_or_404(project_id, user, db)

    existing_descriptions = {
        i.description
        for i in db.query(SiteOverheadItem.description).filter(
            SiteOverheadItem.project_id == project_id
        ).all()
    }

    new_items = []
    for (category, description, unit, quantity, unit_cost) in DEFAULT_OVERHEAD_ITEMS:
        if description not in existing_descriptions:
            new_items.append(SiteOverheadItem(
                project_id=project_id,
                category=category,
                description=description,
                unit=unit,
                quantity=quantity,
                unit_cost=unit_cost,
                total_cost=0.0,
            ))

    db.add_all(new_items)
    db.commit()
    return {"created": len(new_items), "skipped": len(DEFAULT_OVERHEAD_ITEMS) - len(new_items)}


@router.put("/{project_id}/{item_id}")
def update_item(
    project_id: int,
    item_id: int,
    body: OverheadItemUpdate,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    get_project_or_404(project_id, user, db)
    item = db.query(SiteOverheadItem).filter(
        SiteOverheadItem.id == item_id,
        SiteOverheadItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(404, "Overhead item not found")

    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(item, field, val)

    item.total_cost = round(item.quantity * item.unit_cost, 2)
    db.commit()
    db.refresh(item)
    return _item_dict(item)


@router.delete("/{project_id}/{item_id}", status_code=204)
def delete_item(
    project_id: int,
    item_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    get_project_or_404(project_id, user, db)
    item = db.query(SiteOverheadItem).filter(
        SiteOverheadItem.id == item_id,
        SiteOverheadItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(404, "Overhead item not found")
    db.delete(item)
    db.commit()


@router.get("/{project_id}/summary")
def get_summary(
    project_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """Return overhead total by category and grand total."""
    get_project_or_404(project_id, user, db)
    items = db.query(SiteOverheadItem).filter(
        SiteOverheadItem.project_id == project_id
    ).all()

    by_category: dict[str, float] = {}
    for item in items:
        by_category[item.category] = by_category.get(item.category, 0.0) + item.total_cost

    grand_total = sum(by_category.values())
    return {
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "grand_total_overhead": round(grand_total, 2),
        "item_count": len(items),
    }
