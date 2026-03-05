from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Project, Estimate, ProjectFixture, User
from pdf_generator import generate_boq_pdf, generate_engineering_report
from auth_utils import require_active_subscription, get_project_or_404

router = APIRouter()


@router.get("/{project_id}/boq/pdf")
def boq_pdf(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    proj = get_project_or_404(project_id, user, db)
    estimates = db.query(Estimate).filter(Estimate.project_id == project_id).all()
    buf = generate_boq_pdf(proj, estimates)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="BOQ_{proj.project_name}.pdf"'},
    )


@router.get("/{project_id}/engineering/pdf")
def engineering_pdf(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    proj = get_project_or_404(project_id, user, db)
    estimates = db.query(Estimate).filter(Estimate.project_id == project_id).all()
    fixtures  = db.query(ProjectFixture).filter(ProjectFixture.project_id == project_id).all()
    buf = generate_engineering_report(proj, estimates, fixtures)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Report_{proj.project_name}.pdf"'},
    )


@router.get("/{project_id}/boq/data")
def boq_data(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_active_subscription),
):
    proj = get_project_or_404(project_id, user, db)
    estimates = db.query(Estimate).filter(Estimate.project_id == project_id).all()
    mat_cost = sum(e.total_cost or 0 for e in estimates if e.category != "Labor")
    lab_cost = sum(e.total_cost or 0 for e in estimates if e.category == "Labor")
    return {
        "project": {
            "id": proj.id, "name": proj.project_name,
            "location": proj.location, "building_type": proj.building_type,
            "floors": proj.floors,
        },
        "items": [
            {
                "item_name":  e.item_name, "category": e.category,
                "size":       e.size,       "unit":     e.unit,
                "quantity":   e.quantity,   "unit_price": e.unit_price,
                "total_cost": e.total_cost,
            }
            for e in estimates
        ],
        "summary": {
            "material_cost": mat_cost,
            "labor_cost":    lab_cost,
            "grand_total":   mat_cost + lab_cost,
            "item_count":    len(estimates),
        },
    }
