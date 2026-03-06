"""
Stripe billing router for EngEst Pro.
Handles checkout sessions, webhooks, customer portal, invoice history,
billing status, and admin revenue dashboard.
"""
import os
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from database import get_db
from models import User

router = APIRouter()

# ── Stripe config ──────────────────────────────────────────────────────────────

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

WEBHOOK_SECRET   = os.getenv("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL     = os.getenv("FRONTEND_URL", "http://localhost:5173")

PRICE_IDS = {
    "starter":      os.getenv("STRIPE_PRICE_STARTER", ""),
    "professional": os.getenv("STRIPE_PRICE_PROFESSIONAL", ""),
    "enterprise":   os.getenv("STRIPE_PRICE_ENTERPRISE", ""),
}

PLAN_AMOUNTS = {
    "starter": 9,
    "professional": 29,
    "enterprise": 99,
}

# ── Stripe status → local status mapping ──────────────────────────────────────

def _stripe_to_local_status(stripe_status: str) -> str:
    return {
        "trialing": "trial",
        "active":   "active",
        "past_due": "past_due",
        "canceled": "expired",
        "unpaid":   "expired",
        "incomplete":         "trial",
        "incomplete_expired": "expired",
    }.get(stripe_status, "trial")


# ── Schemas ────────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str  # starter | professional | enterprise


# ── POST /checkout ─────────────────────────────────────────────────────────────

@router.post("/checkout")
def create_checkout_session(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
):
    if body.plan not in PRICE_IDS:
        raise HTTPException(400, "Invalid plan")
    price_id = PRICE_IDS[body.plan]
    if not price_id:
        raise HTTPException(503, "Stripe price not configured for this plan")
    if not stripe.api_key:
        raise HTTPException(503, "Stripe not configured — add STRIPE_SECRET_KEY to .env")

    session = stripe.checkout.Session.create(
        customer_email=user.email,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        subscription_data={"trial_period_days": 30},
        success_url=f"{FRONTEND_URL}/billing?success=1",
        cancel_url=f"{FRONTEND_URL}/pricing",
        metadata={"user_id": str(user.id), "plan": body.plan},
    )
    return {"url": session.url}


# ── POST /webhook ──────────────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig     = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid Stripe signature")

    evt_type = event["type"]
    data_obj = event["data"]["object"]

    if evt_type == "checkout.session.completed":
        user_id    = int(data_obj["metadata"].get("user_id", 0))
        plan       = data_obj["metadata"].get("plan", "starter")
        sub_id     = data_obj.get("subscription")
        customer   = data_obj.get("customer")
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.stripe_customer_id     = customer
            user.stripe_subscription_id = sub_id
            user.subscription_plan      = plan
            user.subscription_status    = "trial"
            user.stripe_subscription_status = "trialing"
            db.commit()

    elif evt_type in ("customer.subscription.created", "customer.subscription.updated"):
        sub        = data_obj
        customer   = sub["customer"]
        stripe_st  = sub["status"]
        sub_id     = sub["id"]
        plan_items = sub.get("items", {}).get("data", [])
        # Find user by stripe_customer_id
        user = db.query(User).filter(User.stripe_customer_id == customer).first()
        if user:
            user.stripe_subscription_id     = sub_id
            user.stripe_subscription_status = stripe_st
            user.subscription_status        = _stripe_to_local_status(stripe_st)
            # Update plan from price metadata if available
            if plan_items:
                price = plan_items[0].get("price", {})
                price_id = price.get("id", "")
                for plan_name, pid in PRICE_IDS.items():
                    if pid and pid == price_id:
                        user.subscription_plan = plan_name
                        break
            # Set next billing date from current_period_end
            period_end = sub.get("current_period_end")
            if period_end:
                user.next_billing_date = datetime.fromtimestamp(period_end, tz=timezone.utc).replace(tzinfo=None)
            db.commit()

    elif evt_type == "invoice.payment_succeeded":
        inv      = data_obj
        customer = inv["customer"]
        user = db.query(User).filter(User.stripe_customer_id == customer).first()
        if user:
            user.subscription_status        = "active"
            user.stripe_subscription_status = "active"
            period_end = inv.get("period_end") or inv.get("lines", {}).get("data", [{}])[0].get("period", {}).get("end")
            if period_end:
                user.next_billing_date = datetime.fromtimestamp(period_end, tz=timezone.utc).replace(tzinfo=None)
            db.commit()

    elif evt_type == "invoice.payment_failed":
        customer = data_obj["customer"]
        user = db.query(User).filter(User.stripe_customer_id == customer).first()
        if user:
            user.subscription_status        = "past_due"
            user.stripe_subscription_status = "past_due"
            db.commit()

    elif evt_type == "customer.subscription.deleted":
        sub      = data_obj
        customer = sub["customer"]
        user = db.query(User).filter(User.stripe_customer_id == customer).first()
        if user:
            user.subscription_status        = "expired"
            user.stripe_subscription_status = "canceled"
            db.commit()

    return {"received": True}


# ── POST /portal ───────────────────────────────────────────────────────────────

@router.post("/portal")
def create_portal_session(user: User = Depends(get_current_user)):
    if not user.stripe_customer_id:
        raise HTTPException(400, "No active subscription found. Please upgrade your plan first.")
    if not stripe.api_key:
        raise HTTPException(503, "Stripe not configured")

    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{FRONTEND_URL}/billing",
    )
    return {"url": session.url}


# ── GET /invoices ──────────────────────────────────────────────────────────────

@router.get("/invoices")
def get_invoices(user: User = Depends(get_current_user)):
    if not user.stripe_customer_id or not stripe.api_key:
        return []

    invoices = stripe.Invoice.list(customer=user.stripe_customer_id, limit=10)
    return [
        {
            "id":         inv["id"],
            "date":       inv["created"],
            "amount_usd": inv["amount_paid"] / 100,
            "status":     inv["status"],
            "pdf_url":    inv.get("invoice_pdf"),
        }
        for inv in invoices["data"]
    ]


# ── GET /status ────────────────────────────────────────────────────────────────

@router.get("/status")
def billing_status(user: User = Depends(get_current_user)):
    days_remaining = None
    if user.subscription_status == "trial" and user.trial_end:
        delta = user.trial_end - datetime.utcnow()
        days_remaining = max(0, delta.days)

    return {
        "plan":                     user.subscription_plan,
        "status":                   user.subscription_status,
        "stripe_subscription_status": user.stripe_subscription_status,
        "trial_end":                user.trial_end,
        "next_billing_date":        user.next_billing_date,
        "stripe_subscription_id":   user.stripe_subscription_id,
        "days_remaining":           days_remaining,
        "plan_amount":              PLAN_AMOUNTS.get(user.subscription_plan, 0),
    }


# ── GET /admin/revenue ─────────────────────────────────────────────────────────

@router.get("/admin/revenue")
def admin_revenue(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # DB stats (fast — always available)
    total_users = db.query(User).count()
    trial_users = db.query(User).filter(User.subscription_status == "trial").count()

    if not stripe.api_key:
        return {
            "mrr": 0.0,
            "active_subscriptions": 0,
            "trialing_subscriptions": 0,
            "past_due_subscriptions": 0,
            "canceled_subscriptions": 0,
            "total_users": total_users,
            "trial_users": trial_users,
        }

    # Stripe stats
    subs = stripe.Subscription.list(limit=100, status="all")
    active   = [s for s in subs["data"] if s["status"] == "active"]
    trialing = [s for s in subs["data"] if s["status"] == "trialing"]
    past_due = [s for s in subs["data"] if s["status"] == "past_due"]
    canceled = [s for s in subs["data"] if s["status"] in ("canceled", "unpaid")]

    mrr = sum(
        s["items"]["data"][0]["price"]["unit_amount"] / 100
        for s in active
        if s.get("items", {}).get("data")
    )

    return {
        "mrr":                    round(mrr, 2),
        "active_subscriptions":   len(active),
        "trialing_subscriptions": len(trialing),
        "past_due_subscriptions": len(past_due),
        "canceled_subscriptions": len(canceled),
        "total_users":            total_users,
        "trial_users":            trial_users,
    }
