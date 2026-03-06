"""
Authentication router for EngEst Pro.
Endpoints: signup, login, get current user.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    company_name: Optional[str]
    role: str
    subscription_plan: str
    subscription_status: str
    trial_start: Optional[datetime]
    trial_end: Optional[datetime]
    days_remaining: Optional[int] = None
    # Stripe billing fields
    stripe_subscription_status: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    next_billing_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Helpers ───────────────────────────────────────────────────────────────────

def _compute_days_remaining(user: User) -> Optional[int]:
    if user.subscription_status == "trial" and user.trial_end:
        delta = user.trial_end - datetime.utcnow()
        return max(0, delta.days)
    return None


def _user_to_out(user: User) -> UserOut:
    return UserOut(
        id                         = user.id,
        email                      = user.email,
        full_name                  = user.full_name,
        company_name               = user.company_name,
        role                       = user.role,
        subscription_plan          = user.subscription_plan,
        subscription_status        = user.subscription_status,
        trial_start                = user.trial_start,
        trial_end                  = user.trial_end,
        days_remaining             = _compute_days_remaining(user),
        stripe_subscription_status = user.stripe_subscription_status,
        stripe_subscription_id     = user.stripe_subscription_id,
        next_billing_date          = user.next_billing_date,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    # 1. Check for duplicate email
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Validate password length
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # 3. Create user with 30-day trial
    now = datetime.utcnow()
    user = User(
        email               = body.email,
        password_hash       = hash_password(body.password),
        full_name           = body.full_name,
        company_name        = body.company_name,
        role                = "owner",
        subscription_plan   = "starter",
        subscription_status = "trial",
        trial_start         = now,
        trial_end           = now + timedelta(days=30),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 4. Issue token
    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=_user_to_out(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=_user_to_out(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return _user_to_out(current_user)
