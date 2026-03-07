"""
Lemon Squeezy billing router for EngEst Pro.
Handles checkout sessions, webhooks, customer portal, invoice history,
billing status, and admin revenue dashboard.
"""
import hashlib
import hmac
import json
import os
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from database import get_db
from models import User

router = APIRouter()

# ── Lemon Squeezy config ───────────────────────────────────────────────────────

LS_API_KEY     = os.getenv("LEMONSQUEEZY_API_KEY", "")
LS_STORE_ID    = os.getenv("LS_STORE_ID", "")
WEBHOOK_SECRET = os.getenv("LS_WEBHOOK_SECRET", "")
FRONTEND_URL   = os.getenv("FRONTEND_URL", "http://localhost:5173")

VARIANT_IDS = {
    "basic":        os.getenv("LS_VARIANT_BASIC", ""),
    "professional": os.getenv("LS_VARIANT_PROFESSIONAL", ""),
    "enterprise":   os.getenv("LS_VARIANT_ENTERPRISE", ""),
}

PLAN_AMOUNTS = {
    "basic":        299,
    "professional": 599,
    "enterprise":   1999,
}


def _ls_headers():
    return {
        "Authorization": f"Bearer {LS_API_KEY}",
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
    }


# ── Status mapping ─────────────────────────────────────────────────────────────

def _ls_to_local_status(ls_status: str) -> str:
    return {
        "on_trial":  "trial",
        "active":    "active",
        "past_due":  "past_due",
        "paused":    "past_due",
        "cancelled": "expired",
        "expired":   "expired",
        "unpaid":    "expired",
    }.get(ls_status, "trial")


# ── Schemas ────────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str  # basic | professional | enterprise


# ── POST /checkout ─────────────────────────────────────────────────────────────

@router.post("/checkout")
def create_checkout_session(
    body: CheckoutRequest,
    user: User = Depends(get_current_user),
):
    if body.plan not in VARIANT_IDS:
        raise HTTPException(400, "Invalid plan")
    variant_id = VARIANT_IDS[body.plan]
    if not variant_id:
        raise HTTPException(503, "Lemon Squeezy variant not configured for this plan")
    if not LS_API_KEY:
        raise HTTPException(503, "Lemon Squeezy not configured — add LEMONSQUEEZY_API_KEY to env")

    payload = {
        "data": {
            "type": "checkouts",
            "attributes": {
                "checkout_data": {
                    "email": user.email,
                    "custom": {
                        "user_id": str(user.id),
                        "plan": body.plan,
                    },
                },
                "product_options": {
                    "redirect_url": f"{FRONTEND_URL}/billing?success=1",
                },
            },
            "relationships": {
                "store": {
                    "data": {"type": "stores", "id": str(LS_STORE_ID)}
                },
                "variant": {
                    "data": {"type": "variants", "id": str(variant_id)}
                },
            },
        }
    }

    resp = requests.post(
        "https://api.lemonsqueezy.com/v1/checkouts",
        headers=_ls_headers(),
        json=payload,
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(503, f"Lemon Squeezy error: {resp.text[:300]}")

    checkout_url = resp.json()["data"]["attributes"]["url"]
    return {"url": checkout_url}


# ── POST /webhook ──────────────────────────────────────────────────────────────

@router.post("/webhook")
async def ls_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("X-Signature", "")

    if WEBHOOK_SECRET:
        expected = hmac.new(
            WEBHOOK_SECRET.encode(), payload, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            raise HTTPException(400, "Invalid webhook signature")

    data        = json.loads(payload)
    event_name  = data.get("meta", {}).get("event_name", "")
    custom_data = data.get("meta", {}).get("custom_data", {})
    obj         = data.get("data", {})
    attrs       = obj.get("attributes", {})

    # ── subscription created / updated ────────────────────────────────────────
    if event_name in ("subscription_created", "subscription_updated"):
        user_id     = int(custom_data.get("user_id", 0))
        plan        = custom_data.get("plan", "basic")
        ls_status   = attrs.get("status", "on_trial")
        sub_id      = str(obj.get("id", ""))
        customer_id = str(attrs.get("customer_id", ""))

        user = db.query(User).filter(User.id == user_id).first()
        if not user and customer_id:
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

        if user:
            user.stripe_customer_id         = customer_id
            user.stripe_subscription_id     = sub_id
            user.stripe_subscription_status = ls_status
            user.subscription_plan          = plan
            user.subscription_status        = _ls_to_local_status(ls_status)

            renews_at = attrs.get("renews_at")
            if renews_at:
                try:
                    user.next_billing_date = datetime.fromisoformat(
                        renews_at.replace("Z", "+00:00")
                    ).replace(tzinfo=None)
                except Exception:
                    pass
            db.commit()

    # ── payment succeeded ─────────────────────────────────────────────────────
    elif event_name == "subscription_payment_success":
        sub_id      = str(attrs.get("subscription_id", ""))
        customer_id = str(attrs.get("customer_id", ""))

        user = db.query(User).filter(User.stripe_subscription_id == sub_id).first()
        if not user and customer_id:
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

        if user:
            user.subscription_status        = "active"
            user.stripe_subscription_status = "active"

            renews_at = attrs.get("renews_at")
            if renews_at:
                try:
                    user.next_billing_date = datetime.fromisoformat(
                        renews_at.replace("Z", "+00:00")
                    ).replace(tzinfo=None)
                except Exception:
                    pass
            db.commit()

    # ── payment failed ────────────────────────────────────────────────────────
    elif event_name == "subscription_payment_failed":
        sub_id      = str(attrs.get("subscription_id", obj.get("id", "")))
        customer_id = str(attrs.get("customer_id", ""))

        user = db.query(User).filter(User.stripe_subscription_id == sub_id).first()
        if not user and customer_id:
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

        if user:
            user.subscription_status        = "past_due"
            user.stripe_subscription_status = "past_due"
            db.commit()

    # ── cancelled / expired ───────────────────────────────────────────────────
    elif event_name in ("subscription_cancelled", "subscription_expired"):
        sub_id      = str(obj.get("id", ""))
        customer_id = str(attrs.get("customer_id", ""))

        user = db.query(User).filter(User.stripe_subscription_id == sub_id).first()
        if not user and customer_id:
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()

        if user:
            user.subscription_status        = "expired"
            user.stripe_subscription_status = "cancelled"
            db.commit()

    return {"received": True}


# ── POST /portal ───────────────────────────────────────────────────────────────

@router.post("/portal")
def create_portal_session(user: User = Depends(get_current_user)):
    if not user.stripe_subscription_id:
        raise HTTPException(400, "No active subscription found. Please upgrade your plan first.")
    if not LS_API_KEY:
        raise HTTPException(503, "Lemon Squeezy not configured")

    resp = requests.get(
        f"https://api.lemonsqueezy.com/v1/subscriptions/{user.stripe_subscription_id}",
        headers=_ls_headers(),
    )
    if resp.status_code != 200:
        raise HTTPException(503, "Could not retrieve subscription details")

    portal_url = resp.json()["data"]["attributes"]["urls"]["customer_portal"]
    return {"url": portal_url}


# ── GET /invoices ──────────────────────────────────────────────────────────────

@router.get("/invoices")
def get_invoices(user: User = Depends(get_current_user)):
    if not user.stripe_subscription_id or not LS_API_KEY:
        return []

    resp = requests.get(
        "https://api.lemonsqueezy.com/v1/subscription-invoices",
        headers=_ls_headers(),
        params={"filter[subscription_id]": user.stripe_subscription_id},
    )
    if resp.status_code != 200:
        return []

    invoices = resp.json().get("data", [])
    return [
        {
            "id":         inv["id"],
            "date":       inv["attributes"].get("created_at"),
            "amount_usd": inv["attributes"].get("total", 0) / 100,
            "status":     inv["attributes"].get("status"),
            "pdf_url":    inv["attributes"].get("urls", {}).get("invoice_url"),
        }
        for inv in invoices
    ]


# ── GET /status ────────────────────────────────────────────────────────────────

@router.get("/status")
def billing_status(user: User = Depends(get_current_user)):
    days_remaining = None
    if user.subscription_status == "trial" and user.trial_end:
        delta = user.trial_end - datetime.utcnow()
        days_remaining = max(0, delta.days)

    return {
        "plan":                       user.subscription_plan,
        "status":                     user.subscription_status,
        "stripe_subscription_status": user.stripe_subscription_status,
        "trial_end":                  user.trial_end,
        "next_billing_date":          user.next_billing_date,
        "stripe_subscription_id":     user.stripe_subscription_id,
        "days_remaining":             days_remaining,
        "plan_amount":                PLAN_AMOUNTS.get(user.subscription_plan, 0),
    }


# ── GET /admin/revenue ─────────────────────────────────────────────────────────

@router.get("/admin/revenue")
def admin_revenue(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    total_users = db.query(User).count()
    trial_users = db.query(User).filter(User.subscription_status == "trial").count()

    if not LS_API_KEY:
        return {
            "mrr":                    0.0,
            "active_subscriptions":   0,
            "trialing_subscriptions": 0,
            "past_due_subscriptions": 0,
            "canceled_subscriptions": 0,
            "total_users":            total_users,
            "trial_users":            trial_users,
        }

    resp = requests.get(
        "https://api.lemonsqueezy.com/v1/subscriptions",
        headers=_ls_headers(),
        params={"filter[store_id]": LS_STORE_ID, "page[size]": 100},
    )
    subs = resp.json().get("data", []) if resp.status_code == 200 else []

    active   = [s for s in subs if s["attributes"]["status"] == "active"]
    trialing = [s for s in subs if s["attributes"]["status"] == "on_trial"]
    past_due = [s for s in subs if s["attributes"]["status"] in ("past_due", "paused")]
    canceled = [s for s in subs if s["attributes"]["status"] in ("cancelled", "expired", "unpaid")]

    active_db_users = db.query(User).filter(User.subscription_status == "active").all()
    mrr = sum(PLAN_AMOUNTS.get(u.subscription_plan, 0) for u in active_db_users)

    return {
        "mrr":                    round(mrr, 2),
        "active_subscriptions":   len(active),
        "trialing_subscriptions": len(trialing),
        "past_due_subscriptions": len(past_due),
        "canceled_subscriptions": len(canceled),
        "total_users":            total_users,
        "trial_users":            trial_users,
    }
