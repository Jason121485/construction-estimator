"""
Authentication utilities for EngEst Pro.
JWT creation/verification, password hashing, and FastAPI dependency functions.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db

# ── Config ────────────────────────────────────────────────────────────────────

SECRET_KEY           = os.getenv("SECRET_KEY", "dev-secret-change-me-in-production")
ALGORITHM            = "HS256"
ACCESS_TOKEN_EXPIRE  = timedelta(hours=24)

# ── Plan Limits ───────────────────────────────────────────────────────────────

PLAN_PROJECT_LIMITS = {
    "starter":      5,
    "professional": 50,
    "enterprise":   None,   # None = unlimited
}

PLAN_BUILDING_TYPES = {
    "starter":      ["Residential"],
    "professional": ["Residential", "Commercial"],
    "enterprise":   ["Residential", "Commercial", "Industrial", "Infrastructure"],
}

# ── Password helpers ──────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__truncate_error=False)


def hash_password(password: str) -> str:
    # bcrypt silently truncates at 72 bytes; do it explicitly to avoid ValueError
    return pwd_context.hash(password.encode("utf-8")[:72])


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain.encode("utf-8")[:72], hashed)


# ── JWT helpers ───────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def create_access_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + ACCESS_TOKEN_EXPIRE,
        "type": "access",
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises 401 on any failure."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── FastAPI dependencies ──────────────────────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Decode the Bearer token and return the User ORM object. Raises 401 on failure."""
    from models import User  # local import avoids circular dependency at module level
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Expected access token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_active_subscription(user=Depends(get_current_user)):
    """
    Returns the user if subscription is valid.
    Raises 402 if the trial period has expired or the subscription is not active.
    """
    now = datetime.utcnow()

    if user.subscription_status == "trial":
        if user.trial_end and now > user.trial_end:
            raise HTTPException(
                status_code=402,
                detail={
                    "code": "TRIAL_EXPIRED",
                    "message": "Your 30-day free trial has ended. Please upgrade to continue.",
                },
            )

    if user.subscription_status == "expired":
        raise HTTPException(
            status_code=402,
            detail={
                "code": "SUBSCRIPTION_INACTIVE",
                "message": "Your subscription is not active. Please renew to continue.",
            },
        )

    return user


def check_project_limit(user, db: Session) -> None:
    """
    Raises 403 if the user has reached their plan's project limit.
    Call this before creating a new project.
    """
    from models import Project
    limit = PLAN_PROJECT_LIMITS.get(user.subscription_plan)
    if limit is None:
        return  # enterprise — unlimited
    count = db.query(Project).filter(Project.user_id == user.id).count()
    if count >= limit:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "PROJECT_LIMIT_REACHED",
                "message": (
                    f"Your {user.subscription_plan.capitalize()} plan allows "
                    f"{limit} projects. Upgrade to create more."
                ),
                "limit": limit,
                "current": count,
            },
        )


def check_building_type(user, building_type: Optional[str]) -> None:
    """
    Raises 403 if the project's building type isn't allowed on the user's plan.
    """
    if not building_type:
        return
    allowed = PLAN_BUILDING_TYPES.get(user.subscription_plan, ["Residential"])
    if building_type not in allowed:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "BUILDING_TYPE_NOT_ALLOWED",
                "message": (
                    f"Your {user.subscription_plan.capitalize()} plan does not allow "
                    f"'{building_type}' projects. Upgrade to unlock more project types."
                ),
                "allowed": allowed,
            },
        )


def get_project_or_404(project_id: int, user, db: Session):
    """Fetch a user-owned project by ID. Raises 404 if not found or not owned by the user."""
    from models import Project
    proj = db.query(Project).filter(Project.id == project_id, Project.user_id == user.id).first()
    if not proj:
        raise HTTPException(404, "Project not found")
    return proj
