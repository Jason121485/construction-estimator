"""
Subcontractor Pricing Module.
Allows multiple bids per trade, comparison, and selection of winning subcontractor.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from models import SubcontractorBid
from auth_utils import require_active_subscription, get_project_or_404

router = APIRouter()


class BidCreate(BaseModel):
    trade: str          # Electrical | Plumbing | HVAC | Fire Protection | Elevator | Other
    company_name: Optional[str] = None
    bid_amount: float = 0.0
    notes: Optional[str] = None


class BidUpdate(BaseModel):
    trade: Optional[str] = None
    company_name: Optional[str] = None
    bid_amount: Optional[float] = None
    notes: Optional[str] = None


def _bid_dict(b: SubcontractorBid) -> dict:
    return {
        "id": b.id,
        "project_id": b.project_id,
        "trade": b.trade,
        "company_name": b.company_name,
        "bid_amount": b.bid_amount,
        "notes": b.notes,
        "is_selected": b.is_selected,
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


@router.get("/{project_id}")
def list_bids(
    project_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    get_project_or_404(project_id, user, db)
    bids = db.query(SubcontractorBid).filter(
        SubcontractorBid.project_id == project_id
    ).order_by(SubcontractorBid.trade, SubcontractorBid.bid_amount).all()
    return [_bid_dict(b) for b in bids]


@router.post("/{project_id}", status_code=201)
def add_bid(
    project_id: int,
    body: BidCreate,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    get_project_or_404(project_id, user, db)
    bid = SubcontractorBid(
        project_id=project_id,
        trade=body.trade,
        company_name=body.company_name,
        bid_amount=body.bid_amount,
        notes=body.notes,
        is_selected=False,
    )
    db.add(bid)
    db.commit()
    db.refresh(bid)
    return _bid_dict(bid)


@router.put("/{project_id}/{bid_id}")
def update_bid(
    project_id: int,
    bid_id: int,
    body: BidUpdate,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    get_project_or_404(project_id, user, db)
    bid = db.query(SubcontractorBid).filter(
        SubcontractorBid.id == bid_id,
        SubcontractorBid.project_id == project_id,
    ).first()
    if not bid:
        raise HTTPException(404, "Bid not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(bid, field, val)
    db.commit()
    db.refresh(bid)
    return _bid_dict(bid)


@router.delete("/{project_id}/{bid_id}", status_code=204)
def delete_bid(
    project_id: int,
    bid_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    get_project_or_404(project_id, user, db)
    bid = db.query(SubcontractorBid).filter(
        SubcontractorBid.id == bid_id,
        SubcontractorBid.project_id == project_id,
    ).first()
    if not bid:
        raise HTTPException(404, "Bid not found")
    db.delete(bid)
    db.commit()


@router.patch("/{project_id}/{bid_id}/select")
def select_bid(
    project_id: int,
    bid_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """Mark a bid as selected. Deselects all other bids for the same trade."""
    get_project_or_404(project_id, user, db)
    bid = db.query(SubcontractorBid).filter(
        SubcontractorBid.id == bid_id,
        SubcontractorBid.project_id == project_id,
    ).first()
    if not bid:
        raise HTTPException(404, "Bid not found")

    # Deselect all bids for this trade on this project
    db.query(SubcontractorBid).filter(
        SubcontractorBid.project_id == project_id,
        SubcontractorBid.trade == bid.trade,
    ).update({"is_selected": False})

    # Select the target bid
    bid.is_selected = True
    db.commit()
    db.refresh(bid)
    return _bid_dict(bid)


@router.get("/{project_id}/summary")
def get_summary(
    project_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """Return selected bids grouped by trade plus total subcontractor cost."""
    get_project_or_404(project_id, user, db)
    selected = db.query(SubcontractorBid).filter(
        SubcontractorBid.project_id == project_id,
        SubcontractorBid.is_selected == True,
    ).all()

    by_trade = {b.trade: {"company_name": b.company_name, "bid_amount": b.bid_amount} for b in selected}
    total = sum(b.bid_amount for b in selected)

    return {"by_trade": by_trade, "total_subcontractor_cost": round(total, 2)}
