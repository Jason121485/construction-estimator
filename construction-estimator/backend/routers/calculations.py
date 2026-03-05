from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from calculation_engine import (
    perform_fixture_analysis, perform_pipe_sizing,
    estimate_material_quantities, get_fixture_wsfu_table, get_wsfu,
)

router = APIRouter()


class FixtureInput(BaseModel):
    fixture_type: str
    quantity: int
    wsfu: Optional[float] = None


class AnalysisRequest(BaseModel):
    fixtures: List[FixtureInput]
    floors: Optional[int] = 1
    building_type: Optional[str] = "private"
    pipe_material: Optional[str] = "PPR"
    tank_capacity: Optional[float] = 1000.0
    water_source: Optional[str] = "Municipal"


@router.get("/fixtures/table")
def fixture_table():
    return get_fixture_wsfu_table()


@router.post("/analyze")
def full_analysis(req: AnalysisRequest):
    fixtures_data = [
        {
            "fixture_type": f.fixture_type,
            "quantity":     f.quantity,
            "wsfu":         f.wsfu or get_wsfu(f.fixture_type, req.building_type),
        }
        for f in req.fixtures
    ]

    fixture_result = perform_fixture_analysis(fixtures_data, req.building_type)
    pipe_sizing    = perform_pipe_sizing(fixture_result, req.floors, req.pipe_material)
    project_data   = {
        "floors":        req.floors,
        "tank_capacity": req.tank_capacity,
        "water_source":  req.water_source,
        "building_type": req.building_type,
    }
    quantities = estimate_material_quantities(project_data, fixture_result, pipe_sizing)

    return {
        "fixture_analysis":   fixture_result,
        "pipe_sizing":        pipe_sizing,
        "material_quantities": quantities,
        "project_data":       project_data,
    }


@router.post("/wsfu")
def calc_wsfu(fixtures: List[FixtureInput], building_type: str = "private"):
    from calculation_engine import FIXTURE_WSFU_TABLE
    total = 0.0
    results = []
    for f in fixtures:
        wsfu  = f.wsfu or get_wsfu(f.fixture_type, building_type)
        total_f = f.quantity * wsfu
        total   += total_f
        results.append({
            "fixture_type":  f.fixture_type,
            "fixture_name":  FIXTURE_WSFU_TABLE.get(f.fixture_type, {}).get("name", f.fixture_type),
            "quantity":      f.quantity,
            "wsfu_per_unit": wsfu,
            "total_wsfu":    round(total_f, 2),
        })
    return {"fixtures": results, "total_wsfu": round(total, 2)}
