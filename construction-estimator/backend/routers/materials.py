from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models import Material

router = APIRouter()


class MaterialCreate(BaseModel):
    name: str
    category: str
    size: Optional[str] = None
    unit: Optional[str] = None
    price: float
    supplier: Optional[str] = "Standard"


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    size: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    supplier: Optional[str] = None


class MaterialResponse(BaseModel):
    id: int
    name: str
    category: str
    size: Optional[str] = None
    unit: Optional[str] = None
    price: float
    supplier: Optional[str] = None
    last_updated: Optional[datetime] = None
    is_active: bool = True

    class Config:
        from_attributes = True


@router.get("/", response_model=List[MaterialResponse])
def list_materials(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Material).filter(Material.is_active == True)
    if category:
        q = q.filter(Material.category == category)
    if search:
        q = q.filter(
            Material.name.ilike(f"%{search}%") |
            Material.size.ilike(f"%{search}%")
        )
    return q.order_by(Material.category, Material.name, Material.size).all()


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Material.category).distinct().all()
    return sorted([r[0] for r in rows])


@router.post("/", response_model=MaterialResponse)
def create_material(body: MaterialCreate, db: Session = Depends(get_db)):
    mat = Material(**body.model_dump())
    db.add(mat)
    db.commit()
    db.refresh(mat)
    return mat


@router.get("/{material_id}", response_model=MaterialResponse)
def get_material(material_id: int, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(404, "Material not found")
    return mat


@router.put("/{material_id}", response_model=MaterialResponse)
def update_material(material_id: int, body: MaterialUpdate, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(404, "Material not found")
    for k, v in body.dict(exclude_unset=True).items():
        setattr(mat, k, v)
    db.commit()
    db.refresh(mat)
    return mat


@router.delete("/{material_id}")
def delete_material(material_id: int, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(404, "Material not found")
    mat.is_active = False
    db.commit()
    return {"message": "Deactivated"}


class PriceUpdate(BaseModel):
    price: float

@router.patch("/{material_id}/price", response_model=MaterialResponse)
def update_price(material_id: int, body: PriceUpdate, db: Session = Depends(get_db)):
    mat = db.query(Material).filter(Material.id == material_id).first()
    if not mat:
        raise HTTPException(404, "Material not found")
    mat.price = body.price
    db.commit()
    db.refresh(mat)
    return mat
