"""
Bid Summary Router.
Computes the final bid price:
  Direct Cost + Subcontractor Cost + Overhead + Contingency + Profit = Final Bid
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import BidSummary, Estimate, SubcontractorBid, SiteOverheadItem
from auth_utils import require_active_subscription, get_project_or_404

router = APIRouter()


class BidSettings(BaseModel):
    contingency_pct: float = 5.0
    profit_pct: float = 10.0


def _compute_bid(project_id: int, contingency_pct: float, profit_pct: float, db: Session) -> dict:
    """Compute all bid components and return a breakdown dict."""
    # Direct cost = sum of all estimate line items
    estimates = db.query(Estimate).filter(Estimate.project_id == project_id).all()
    direct_cost = sum(e.total_cost for e in estimates)

    # Subcontractor cost = sum of selected bids
    selected_bids = db.query(SubcontractorBid).filter(
        SubcontractorBid.project_id == project_id,
        SubcontractorBid.is_selected == True,
    ).all()
    subcontractor_cost = sum(b.bid_amount for b in selected_bids)

    # Overhead cost = sum of overhead item totals
    overhead_items = db.query(SiteOverheadItem).filter(
        SiteOverheadItem.project_id == project_id
    ).all()
    overhead_cost = sum(i.total_cost for i in overhead_items)

    subtotal = direct_cost + subcontractor_cost + overhead_cost
    contingency_amount = subtotal * (contingency_pct / 100)
    profit_amount = (subtotal + contingency_amount) * (profit_pct / 100)
    final_bid = subtotal + contingency_amount + profit_amount

    return {
        "direct_cost": round(direct_cost, 2),
        "subcontractor_cost": round(subcontractor_cost, 2),
        "overhead_cost": round(overhead_cost, 2),
        "subtotal": round(subtotal, 2),
        "contingency_pct": contingency_pct,
        "contingency_amount": round(contingency_amount, 2),
        "profit_pct": profit_pct,
        "profit_amount": round(profit_amount, 2),
        "final_bid": round(final_bid, 2),
        # Detail breakdowns
        "direct_cost_detail": {
            "material_cost": round(sum(e.total_cost for e in estimates if e.category != "Labor"), 2),
            "labor_cost": round(sum(e.total_cost for e in estimates if e.category == "Labor"), 2),
            "by_discipline": _group_by(estimates, "discipline"),
        },
        "subcontractor_detail": {b.trade: b.bid_amount for b in selected_bids},
        "overhead_detail": _group_overhead(overhead_items),
    }


def _group_by(items, attr: str) -> dict:
    result: dict[str, float] = {}
    for item in items:
        key = getattr(item, attr) or "Other"
        result[key] = round(result.get(key, 0.0) + item.total_cost, 2)
    return result


def _group_overhead(items) -> dict:
    result: dict[str, float] = {}
    for item in items:
        key = item.category or "Misc"
        result[key] = round(result.get(key, 0.0) + item.total_cost, 2)
    return result


@router.get("/{project_id}")
def get_bid_summary(
    project_id: int,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """Compute fresh bid summary and cache it in BidSummary table."""
    proj = get_project_or_404(project_id, user, db)

    # Load or create BidSummary settings row
    bs = db.query(BidSummary).filter(BidSummary.project_id == project_id).first()
    contingency_pct = bs.contingency_pct if bs else 5.0
    profit_pct = bs.profit_pct if bs else 10.0

    breakdown = _compute_bid(project_id, contingency_pct, profit_pct, db)

    # Upsert cached values
    if bs:
        bs.direct_cost = breakdown["direct_cost"]
        bs.subcontractor_cost = breakdown["subcontractor_cost"]
        bs.overhead_cost = breakdown["overhead_cost"]
        bs.contingency_amount = breakdown["contingency_amount"]
        bs.profit_amount = breakdown["profit_amount"]
        bs.final_bid = breakdown["final_bid"]
    else:
        bs = BidSummary(
            project_id=project_id,
            contingency_pct=contingency_pct,
            profit_pct=profit_pct,
            direct_cost=breakdown["direct_cost"],
            subcontractor_cost=breakdown["subcontractor_cost"],
            overhead_cost=breakdown["overhead_cost"],
            contingency_amount=breakdown["contingency_amount"],
            profit_amount=breakdown["profit_amount"],
            final_bid=breakdown["final_bid"],
        )
        db.add(bs)

    db.commit()

    return {
        "project_id": project_id,
        "project_name": proj.project_name,
        "client_name": proj.client_name,
        "contract_type": proj.contract_type,
        "delivery_method": proj.delivery_method,
        **breakdown,
    }


@router.put("/{project_id}/settings")
def update_bid_settings(
    project_id: int,
    body: BidSettings,
    user=Depends(require_active_subscription),
    db: Session = Depends(get_db),
):
    """Update contingency and profit percentages, then return recomputed bid summary."""
    get_project_or_404(project_id, user, db)

    bs = db.query(BidSummary).filter(BidSummary.project_id == project_id).first()
    if bs:
        bs.contingency_pct = body.contingency_pct
        bs.profit_pct = body.profit_pct
    else:
        bs = BidSummary(
            project_id=project_id,
            contingency_pct=body.contingency_pct,
            profit_pct=body.profit_pct,
        )
        db.add(bs)
    db.commit()

    # Return fresh computation
    breakdown = _compute_bid(project_id, body.contingency_pct, body.profit_pct, db)
    return {"project_id": project_id, **breakdown}
