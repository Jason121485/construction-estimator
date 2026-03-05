"""
Plumbing Engineering Calculation Engine
Based on Philippine Plumbing Code (PPC) and ASPE standards.
Uses Hunter's Method for peak flow estimation and Hazen-Williams for hydraulics.
"""
import math
from typing import List, Dict, Any, Optional

# ---------------------------------------------------------------------------
# WSFU Lookup Table (Water Supply Fixture Units)
# Private = residential; Public = commercial/institutional
# ---------------------------------------------------------------------------
FIXTURE_WSFU_TABLE = {
    "water_closet_tank":        {"name": "Water Closet (Tank)",         "private": 2.2,  "public": 2.5},
    "water_closet_flushvalve":  {"name": "Water Closet (Flush Valve)",  "private": 2.5,  "public": 5.0},
    "lavatory":                 {"name": "Lavatory",                    "private": 0.5,  "public": 1.0},
    "shower":                   {"name": "Shower",                      "private": 2.0,  "public": 2.0},
    "bathtub":                  {"name": "Bathtub",                     "private": 2.0,  "public": 4.0},
    "kitchen_sink":             {"name": "Kitchen Sink",                "private": 2.0,  "public": 4.0},
    "urinal_flushvalve":        {"name": "Urinal (Flush Valve)",        "private": None, "public": 5.0},
    "urinal_tank":              {"name": "Urinal (Tank)",               "private": None, "public": 3.8},
    "service_sink":             {"name": "Service Sink",                "private": 3.0,  "public": 3.0},
    "laundry_washer":           {"name": "Laundry (Washer)",            "private": 2.0,  "public": 4.0},
    "dishwasher":               {"name": "Dishwasher",                  "private": 1.5,  "public": 1.5},
    "floor_drain":              {"name": "Floor Drain",                 "private": 0.5,  "public": 0.5},
    "hose_bibb":                {"name": "Hose Bibb / Faucet",         "private": 2.5,  "public": 5.0},
}

# ---------------------------------------------------------------------------
# Hunter's Curve — (Total WSFU, Peak Flow GPM)
# Digitized from ASPE Data Book Table
# ---------------------------------------------------------------------------
HUNTERS_CURVE = [
    (0, 0), (1, 3), (2, 5), (3, 6.5), (4, 8), (5, 9), (6, 10),
    (8, 12), (10, 14), (12, 15.5), (15, 17), (18, 19), (20, 21),
    (25, 24), (30, 26.5), (35, 28.5), (40, 30), (50, 33), (60, 35),
    (70, 37), (80, 39), (90, 41), (100, 43), (120, 46), (140, 49),
    (160, 52), (180, 55), (200, 57), (250, 63), (300, 68), (350, 73),
    (400, 77), (500, 85), (600, 92), (700, 98), (800, 104), (1000, 116),
    (1200, 127), (1500, 141), (2000, 159),
]

# Standard nominal pipe diameters (mm)
STANDARD_PIPE_SIZES_MM = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200]

# Hazen-Williams C coefficients by pipe material
HW_COEFFICIENTS = {
    "PPR": 150, "PVC": 140, "GI": 120, "Copper": 140, "HDPE": 150, "Steel": 100,
}


# ---------------------------------------------------------------------------
# Unit Conversions
# ---------------------------------------------------------------------------
def gpm_to_lps(gpm: float) -> float:
    return gpm * 0.06309

def lps_to_gpm(lps: float) -> float:
    return lps / 0.06309

def lps_to_m3h(lps: float) -> float:
    return lps * 3.6


# ---------------------------------------------------------------------------
# WSFU Helpers
# ---------------------------------------------------------------------------
def get_wsfu(fixture_type: str, building_type: str = "private") -> float:
    fixture = FIXTURE_WSFU_TABLE.get(fixture_type, {})
    val = fixture.get(building_type)
    if val is None:
        val = fixture.get("public", 1.0)
    return val or 1.0


def get_fixture_wsfu_table() -> List[Dict]:
    return [
        {
            "fixture_type":  key,
            "fixture_name":  data["name"],
            "wsfu_private":  data.get("private"),
            "wsfu_public":   data.get("public"),
        }
        for key, data in FIXTURE_WSFU_TABLE.items()
    ]


# ---------------------------------------------------------------------------
# Hunter's Curve interpolation
# ---------------------------------------------------------------------------
def get_peak_flow_gpm(total_wsfu: float) -> float:
    if total_wsfu <= 0:
        return 0.0
    curve = HUNTERS_CURVE
    if total_wsfu <= curve[-1][0]:
        for i in range(len(curve) - 1):
            w1, q1 = curve[i]
            w2, q2 = curve[i + 1]
            if w1 <= total_wsfu <= w2:
                ratio = (total_wsfu - w1) / (w2 - w1) if w2 != w1 else 0
                return q1 + ratio * (q2 - q1)
    # Extrapolate beyond table using square-root scaling
    w_last, q_last = curve[-1]
    return q_last * math.sqrt(total_wsfu / w_last)


# ---------------------------------------------------------------------------
# Hydraulic Calculations
# ---------------------------------------------------------------------------
def calculate_pipe_diameter_mm(flow_lps: float, velocity_mps: float = 2.0) -> float:
    """Minimum pipe diameter (mm) for given flow and target velocity."""
    if flow_lps <= 0 or velocity_mps <= 0:
        return 15.0
    flow_m3s = flow_lps / 1000.0
    area_m2 = flow_m3s / velocity_mps
    diam_m = math.sqrt(4 * area_m2 / math.pi)
    return diam_m * 1000.0


def select_standard_pipe_size(required_mm: float) -> int:
    for size in STANDARD_PIPE_SIZES_MM:
        if size >= required_mm:
            return size
    return STANDARD_PIPE_SIZES_MM[-1]


def calculate_velocity(flow_lps: float, pipe_diameter_mm: float) -> float:
    """Flow velocity in m/s."""
    if pipe_diameter_mm <= 0 or flow_lps <= 0:
        return 0.0
    D = pipe_diameter_mm / 1000.0
    Q = flow_lps / 1000.0
    A = math.pi * (D / 2) ** 2
    return Q / A


def calculate_pressure_loss_hw(
    flow_lps: float, pipe_diameter_mm: float, length_m: float, material: str = "PPR"
) -> float:
    """
    Head loss (m water column) via Hazen-Williams.
    hf = 10.67 × L × Q^1.852 / (C^1.852 × D^4.87)
    Q in m³/s, D in m.
    """
    if flow_lps <= 0 or pipe_diameter_mm <= 0 or length_m <= 0:
        return 0.0
    C = HW_COEFFICIENTS.get(material, 140)
    D = pipe_diameter_mm / 1000.0
    Q = flow_lps / 1000.0
    hf = (10.67 * length_m * (Q ** 1.852)) / ((C ** 1.852) * (D ** 4.87))
    return round(hf, 4)


# ---------------------------------------------------------------------------
# Full Fixture Analysis
# ---------------------------------------------------------------------------
def perform_fixture_analysis(
    fixtures: List[Dict], building_type: str = "private"
) -> Dict:
    fixture_results = []
    total_wsfu = 0.0

    for f in fixtures:
        ftype = f.get("fixture_type", "")
        qty   = f.get("quantity", 0)
        wsfu  = f.get("wsfu") or get_wsfu(ftype, building_type)
        total_f = qty * wsfu
        total_wsfu += total_f
        fixture_results.append({
            "fixture_type":  ftype,
            "fixture_name":  FIXTURE_WSFU_TABLE.get(ftype, {}).get("name", ftype),
            "quantity":      qty,
            "wsfu_per_unit": wsfu,
            "total_wsfu":    round(total_f, 2),
        })

    peak_gpm = get_peak_flow_gpm(total_wsfu)
    peak_lps = gpm_to_lps(peak_gpm)
    total_fixtures = sum(f.get("quantity", 0) for f in fixtures)
    occupancy = total_fixtures * 2
    daily_liters = occupancy * 150  # 150 L/person/day (PPC)

    return {
        "fixtures":           fixture_results,
        "total_wsfu":         round(total_wsfu, 2),
        "peak_flow_gpm":      round(peak_gpm, 2),
        "peak_flow_lps":      round(peak_lps, 3),
        "peak_flow_m3h":      round(lps_to_m3h(peak_lps), 2),
        "estimated_occupancy": occupancy,
        "daily_demand_liters": daily_liters,
        "daily_demand_m3":    round(daily_liters / 1000, 2),
        "building_type":      building_type,
    }


# ---------------------------------------------------------------------------
# Pipe Sizing
# ---------------------------------------------------------------------------
def perform_pipe_sizing(
    analysis: Dict, floors: int = 1, pipe_material: str = "PPR"
) -> List[Dict]:
    peak_lps = analysis.get("peak_flow_lps", 0.1)
    sections = []

    def make_section(name, desc, flow, target_v, length_ref):
        req_d  = calculate_pipe_diameter_mm(flow, target_v)
        sel_d  = select_standard_pipe_size(req_d)
        v      = calculate_velocity(flow, sel_d)
        hl     = calculate_pressure_loss_hw(flow, sel_d, length_ref, pipe_material)
        hl_100 = round(hl / length_ref * 100, 3) if length_ref else 0
        return {
            "section":               name,
            "description":           desc,
            "flow_rate_lps":         round(flow, 3),
            "flow_rate_gpm":         round(lps_to_gpm(flow), 2),
            "required_diameter_mm":  round(req_d, 1),
            "pipe_diameter_mm":      sel_d,
            "velocity_mps":          round(v, 2),
            "head_loss_m_per_100m":  hl_100,
            "material":              pipe_material,
            "velocity_ok":           0.6 <= v <= 3.0,
        }

    # Main supply (full peak flow, 2.0 m/s target)
    sections.append(make_section(
        "Main Supply Line",
        "From water source / tank to main riser",
        peak_lps, 2.0, 5.0
    ))

    # Riser per floor group
    for flr in range(1, min(floors + 1, 5)):
        fraction = (floors - flr + 1) / floors
        flow = max(0.05, peak_lps * fraction)
        sections.append(make_section(
            f"Riser — Floor {flr}",
            f"Vertical supply riser to floor {flr}",
            flow, 2.0, float(floors) * 3.0
        ))

    # Fixture branch (10 % of peak, slower velocity OK)
    sections.append(make_section(
        "Fixture Branch",
        "Individual fixture connections",
        max(0.05, peak_lps * 0.08), 1.5, 3.0
    ))

    return sections


# ---------------------------------------------------------------------------
# Material Quantity Estimator
# ---------------------------------------------------------------------------
def estimate_material_quantities(
    project_data: Dict,
    fixture_analysis: Dict,
    pipe_sizing: List[Dict],
) -> List[Dict]:
    floors        = project_data.get("floors", 1)
    tank_cap      = project_data.get("tank_capacity", 1000)
    total_fixtures= sum(f.get("quantity", 0) for f in fixture_analysis.get("fixtures", []))
    peak_lps      = fixture_analysis.get("peak_flow_lps", 0)

    main_size   = pipe_sizing[0]["pipe_diameter_mm"] if pipe_sizing else 32
    branch_size = pipe_sizing[1]["pipe_diameter_mm"] if len(pipe_sizing) > 1 else 25
    fix_size    = pipe_sizing[-1]["pipe_diameter_mm"] if pipe_sizing else 20

    FH = 3.0  # floor height (m)
    FA = 150  # floor area m²

    mats = []

    def add(cat, name, size, unit, qty, notes=""):
        mats.append({
            "category": cat, "material": name, "size": size,
            "unit": unit, "quantity": math.ceil(qty), "notes": notes,
        })

    # --- Supply pipes (PPR) ---
    add("Supply Pipe", "PPR Pipe", f"{main_size}mm",   "length",
        (floors * FH + 10) / 4,      "Main supply riser")
    add("Supply Pipe", "PPR Pipe", f"{branch_size}mm", "length",
        (math.sqrt(FA) * 2 * floors) / 4, "Floor distribution")
    add("Supply Pipe", "PPR Pipe", f"{fix_size}mm",    "length",
        (total_fixtures * 1.5) / 4,  "Fixture connections")

    # --- Drainage pipes (PVC) ---
    add("Drainage Pipe", "PVC Pipe", "100mm", "length",
        (floors * FH + 3) / 3,       "Soil/vent stack")
    add("Drainage Pipe", "PVC Pipe", "75mm",  "length",
        (total_fixtures * 2.0) / 3,  "Branch drains")
    add("Drainage Pipe", "PVC Pipe", "50mm",  "length",
        max(1, total_fixtures * 0.5 / 3), "Small branch drains")

    # --- PPR fittings ---
    ppr_lengths = sum(m["quantity"] for m in mats if m["material"] == "PPR Pipe")
    add("Fitting", "PPR Elbow 90°", f"{branch_size}mm", "pcs", ppr_lengths * 2.0, "")
    add("Fitting", "PPR Tee",       f"{branch_size}mm", "pcs", ppr_lengths * 1.5, "")
    add("Fitting", "PPR Reducer",   f"{branch_size}x{fix_size}mm", "pcs", total_fixtures, "")

    # --- PVC fittings ---
    add("Fitting", "PVC Elbow 90°",   "100mm", "pcs", floors * 2 + 4, "")
    add("Fitting", "PVC Tee",         "100mm", "pcs", total_fixtures + floors, "")
    add("Fitting", "PVC Sanitary Tee","100mm", "pcs", total_fixtures, "")
    add("Fitting", "Floor Drain (PVC)","100mm","pcs", max(1, floors), "One per floor")
    add("Fitting", "P-Trap",           "50mm", "pcs", total_fixtures, "")

    # --- Valves ---
    add("Valve", "Gate Valve", f"{main_size}mm",   "pcs", 2,              "Main isolation")
    add("Valve", "Gate Valve", f"{branch_size}mm", "pcs", floors * 2,     "Floor isolation")
    add("Valve", "Ball Valve", "15mm",             "pcs", total_fixtures, "Fixture isolation")
    add("Valve", "Check Valve (Swing)", f"{branch_size}mm", "pcs", 1,     "Backflow prevention")
    add("Valve", "Float Valve", "25mm",            "pcs", 1,              "Tank level control")

    # --- Equipment ---
    if tank_cap <= 500:       tsize = "500L"
    elif tank_cap <= 1000:    tsize = "1000L"
    elif tank_cap <= 2000:    tsize = "2000L"
    else:                     tsize = "2000L"
    num_tanks = math.ceil(tank_cap / int(tsize.replace("L", "")))
    add("Equipment", "Water Tank (Polyethylene)", tsize, "unit", num_tanks,
        f"{tank_cap:,.0f} L total capacity")

    pump_hp = "1HP" if peak_lps > 1.0 else "0.5HP"
    add("Equipment", "Booster Pump", pump_hp, "unit", 1, "Pressure booster")
    add("Equipment", "Pressure Tank", "20L",  "unit", 1, "Pressure vessel")

    # --- Labor ---
    rough_days  = math.ceil(total_fixtures * 0.5 + floors * 2)
    finish_days = math.ceil(total_fixtures * 0.3 + 2)
    add("Labor", "Plumbing Labor (Rough-in)", "N/A", "day", rough_days, "Pipe installation")
    add("Labor", "Plumbing Labor (Finishing)","N/A", "day", finish_days, "Fixture installation & testing")

    return mats
