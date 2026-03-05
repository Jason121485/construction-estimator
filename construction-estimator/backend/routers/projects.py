from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Project, Estimate, User
from auth_utils import (
    require_active_subscription,
    check_project_limit,
    check_building_type,
    get_project_or_404,
)

router = APIRouter()

PROFIT_RATE = 0.30
VAT_RATE    = 0.12


class ProjectCreate(BaseModel):
    project_name: str
    location: Optional[str] = None
    building_type: Optional[str] = "Residential"
    floors: Optional[int] = 1
    building_area: Optional[float] = 0.0
    water_source: Optional[str] = "Municipal"
    tank_capacity: Optional[float] = 1000.0
    distance_from_manila: Optional[float] = 0.0
    transport_cost_per_km: Optional[float] = 50.0
    num_workers: Optional[int] = 5


class ProjectResponse(BaseModel):
    id: int
    project_name: str
    location: Optional[str] = None
    building_type: Optional[str] = None
    floors: Optional[int] = None
    building_area: Optional[float] = None
    water_source: Optional[str] = None
    tank_capacity: Optional[float] = None
    distance_from_manila: Optional[float] = None
    transport_cost_per_km: Optional[float] = None
    num_workers: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    return (
        db.query(Project)
        .filter(Project.user_id == user.id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("/", response_model=ProjectResponse)
def create_project(
    body: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    check_project_limit(user, db)
    check_building_type(user, body.building_type)

    proj = Project(**body.model_dump(), user_id=user.id)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    return get_project_or_404(project_id, user, db)


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int,
    body: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    proj = get_project_or_404(project_id, user, db)
    check_building_type(user, body.building_type)
    for k, v in body.model_dump().items():
        setattr(proj, k, v)
    db.commit()
    db.refresh(proj)
    return proj


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    proj = get_project_or_404(project_id, user, db)
    db.delete(proj)
    db.commit()
    return {"message": "Deleted"}


@router.get("/{project_id}/summary")
def project_summary(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    proj = get_project_or_404(project_id, user, db)
    estimates = db.query(Estimate).filter(Estimate.project_id == project_id).all()

    # Costs by discipline
    discipline_costs = {}
    for e in estimates:
        disc = e.discipline or "Plumbing"
        discipline_costs[disc] = discipline_costs.get(disc, 0) + (e.total_cost or 0)

    mat_cost = sum(e.total_cost or 0 for e in estimates if e.category != "Labor")
    lab_cost = sum(e.total_cost or 0 for e in estimates if e.category == "Labor")

    # Mobilization cost
    distance = proj.distance_from_manila or 0
    cost_km   = proj.transport_cost_per_km or 50
    workers   = proj.num_workers or 5
    mob_cost  = distance * cost_km * 2
    mob_cost += workers * 500 * 2 if distance > 0 else 0

    sub_total   = mat_cost + lab_cost
    grand_total = sub_total + mob_cost

    return {
        "project":           ProjectResponse.model_validate(proj),
        "material_cost":     mat_cost,
        "labor_cost":        lab_cost,
        "mobilization_cost": mob_cost,
        "grand_total":       grand_total,
        "item_count":        len(estimates),
        "discipline_costs":  discipline_costs,
    }
