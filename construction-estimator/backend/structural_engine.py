"""
Structural Quantity Takeoff Engine
Calculates concrete volumes, rebar quantities, and formwork areas
for residential, commercial, and industrial construction projects.
"""
import math
from typing import List, Dict, Any

# ---------------------------------------------------------------------------
# Material Densities & Standard Values
# ---------------------------------------------------------------------------
STEEL_DENSITY_KG_M3 = 7850.0   # kg/m³ for steel rebar

# Rebar ratio by element type (percentage of concrete volume)
# Based on NSCP (National Structural Code of the Philippines)
REBAR_RATIO = {
    "slab":    0.0050,   # 0.50% — two-way slab minimum
    "beam":    0.0120,   # 1.20% — typical flexural members
    "column":  0.0200,   # 2.00% — typical compression members
    "footing": 0.0040,   # 0.40% — mat/isolated footing
    "wall":    0.0025,   # 0.25% — concrete wall (shear/retaining)
    "stair":   0.0060,   # 0.60%
    "ramp":    0.0060,
}

# Concrete waste factor
CONCRETE_WASTE = 1.05    # 5% waste

# Steel wastage & lapping factor
STEEL_WASTE = 1.10       # 10% for lapping and cutting waste

# Standard rebar diameters (mm)
STANDARD_REBAR_DIAMETERS_MM = [10, 12, 16, 20, 25, 28, 32, 36, 40]

# Concrete class mix ratios (cement bags per m³)
CEMENT_BAGS_PER_M3 = {
    "C16 (1:2:4)":  7.0,
    "C20 (1:1.5:3)": 8.5,
    "C25 (1:1:2)":  10.0,
    "C28":          11.0,
    "C30":          12.0,
    "C35":          13.5,
}

# Sand (m³) per m³ of concrete
SAND_PER_M3 = {
    "C16 (1:2:4)":  0.54,
    "C20 (1:1.5:3)": 0.42,
    "C25 (1:1:2)":   0.35,
    "C28":           0.32,
    "C30":           0.30,
    "C35":           0.28,
}

# Gravel (m³) per m³ of concrete
GRAVEL_PER_M3 = {
    "C16 (1:2:4)":  0.77,
    "C20 (1:1.5:3)": 0.64,
    "C25 (1:1:2)":   0.55,
    "C28":           0.50,
    "C30":           0.47,
    "C35":           0.44,
}


# ---------------------------------------------------------------------------
# Element-Level Calculations
# ---------------------------------------------------------------------------
def calc_slab(length_m: float, width_m: float, thickness_m: float,
              quantity: int = 1) -> Dict:
    """Flat slab or floor deck."""
    vol_net = length_m * width_m * thickness_m * quantity
    vol_w   = vol_net * CONCRETE_WASTE
    steel_kg_net = vol_net * REBAR_RATIO["slab"] * STEEL_DENSITY_KG_M3
    steel_kg     = steel_kg_net * STEEL_WASTE
    formwork_m2  = length_m * width_m * quantity  # bottom form only

    return {
        "element_type":    "Slab",
        "quantity":        quantity,
        "dimensions":      f"{length_m}m × {width_m}m × {thickness_m*1000:.0f}mm",
        "concrete_m3":     round(vol_w, 2),
        "rebar_kg":        round(steel_kg, 1),
        "formwork_m2":     round(formwork_m2, 2),
    }


def calc_beam(width_m: float, depth_m: float, length_m: float,
              quantity: int = 1) -> Dict:
    """Rectangular beam (excluding slab thickness)."""
    vol_net = width_m * depth_m * length_m * quantity
    vol_w   = vol_net * CONCRETE_WASTE
    steel_kg_net = vol_net * REBAR_RATIO["beam"] * STEEL_DENSITY_KG_M3
    steel_kg     = steel_kg_net * STEEL_WASTE
    # Formwork: bottom + 2 sides
    formwork_m2  = (width_m + 2 * depth_m) * length_m * quantity

    return {
        "element_type":    "Beam",
        "quantity":        quantity,
        "dimensions":      f"{width_m*1000:.0f}mm × {depth_m*1000:.0f}mm × {length_m}m",
        "concrete_m3":     round(vol_w, 2),
        "rebar_kg":        round(steel_kg, 1),
        "formwork_m2":     round(formwork_m2, 2),
    }


def calc_column(width_m: float, depth_m: float, height_m: float,
                quantity: int = 1) -> Dict:
    """Rectangular or square column."""
    vol_net = width_m * depth_m * height_m * quantity
    vol_w   = vol_net * CONCRETE_WASTE
    steel_kg_net = vol_net * REBAR_RATIO["column"] * STEEL_DENSITY_KG_M3
    steel_kg     = steel_kg_net * STEEL_WASTE
    # Formwork: 4 sides
    formwork_m2  = 2 * (width_m + depth_m) * height_m * quantity

    return {
        "element_type":    "Column",
        "quantity":        quantity,
        "dimensions":      f"{width_m*1000:.0f}mm × {depth_m*1000:.0f}mm × {height_m}m H",
        "concrete_m3":     round(vol_w, 2),
        "rebar_kg":        round(steel_kg, 1),
        "formwork_m2":     round(formwork_m2, 2),
    }


def calc_footing(length_m: float, width_m: float, depth_m: float,
                 quantity: int = 1) -> Dict:
    """Isolated spread footing."""
    vol_net = length_m * width_m * depth_m * quantity
    vol_w   = vol_net * CONCRETE_WASTE
    steel_kg_net = vol_net * REBAR_RATIO["footing"] * STEEL_DENSITY_KG_M3
    steel_kg     = steel_kg_net * STEEL_WASTE
    # Formwork: 4 sides only (bottom = earthwork)
    formwork_m2  = 2 * (length_m + width_m) * depth_m * quantity

    return {
        "element_type":    "Footing",
        "quantity":        quantity,
        "dimensions":      f"{length_m}m × {width_m}m × {depth_m}m",
        "concrete_m3":     round(vol_w, 2),
        "rebar_kg":        round(steel_kg, 1),
        "formwork_m2":     round(formwork_m2, 2),
    }


def calc_wall(length_m: float, height_m: float, thickness_m: float,
              quantity: int = 1) -> Dict:
    """Concrete shear wall or retaining wall."""
    vol_net = length_m * height_m * thickness_m * quantity
    vol_w   = vol_net * CONCRETE_WASTE
    steel_kg_net = vol_net * REBAR_RATIO["wall"] * STEEL_DENSITY_KG_M3
    steel_kg     = steel_kg_net * STEEL_WASTE
    formwork_m2  = 2 * length_m * height_m * quantity   # both faces

    return {
        "element_type":    "Wall",
        "quantity":        quantity,
        "dimensions":      f"{length_m}m × {height_m}m H × {thickness_m*1000:.0f}mm thk",
        "concrete_m3":     round(vol_w, 2),
        "rebar_kg":        round(steel_kg, 1),
        "formwork_m2":     round(formwork_m2, 2),
    }


def calc_stair(floor_to_floor_m: float, stair_width_m: float,
               slab_thickness_m: float = 0.15, quantity: int = 1) -> Dict:
    """Stair slab (inclined slab approximation)."""
    slope_factor = math.sqrt(1 + (floor_to_floor_m / 4.5) ** 2)
    inclined_length = 4.5 * slope_factor  # assume 4.5m horizontal run
    vol_net = inclined_length * stair_width_m * slab_thickness_m * quantity
    vol_w   = vol_net * CONCRETE_WASTE
    steel_kg = vol_net * REBAR_RATIO["stair"] * STEEL_DENSITY_KG_M3 * STEEL_WASTE
    formwork_m2 = inclined_length * stair_width_m * quantity

    return {
        "element_type":    "Stair",
        "quantity":        quantity,
        "dimensions":      f"Floor-to-Floor {floor_to_floor_m}m, Width {stair_width_m}m",
        "concrete_m3":     round(vol_w, 2),
        "rebar_kg":        round(steel_kg, 1),
        "formwork_m2":     round(formwork_m2, 2),
    }


# ---------------------------------------------------------------------------
# Full Structural Takeoff
# ---------------------------------------------------------------------------
ELEMENT_CALCULATORS = {
    "slab":    calc_slab,
    "beam":    calc_beam,
    "column":  calc_column,
    "footing": calc_footing,
    "wall":    calc_wall,
    "stair":   calc_stair,
}


def perform_structural_takeoff(
    elements: List[Dict],
    concrete_class: str = "C25 (1:1:2)",
    rebar_grade: str = "Grade 60",
) -> Dict:
    """
    Full structural quantity takeoff.

    Each element dict has keys:
        type, label (optional), quantity, and dimension keys per type.

    Returns:
        element results, totals, and material quantities (concrete + rebar + formwork).
    """
    results = []
    total_concrete_m3 = 0.0
    total_rebar_kg    = 0.0
    total_formwork_m2 = 0.0

    for el in elements:
        etype = el.get("type", "slab").lower()
        qty   = int(el.get("quantity", 1))
        label = el.get("label", etype.title())

        try:
            if etype == "slab":
                r = calc_slab(
                    float(el.get("length_m", 5)),
                    float(el.get("width_m", 5)),
                    float(el.get("thickness_m", 0.15)),
                    qty,
                )
            elif etype == "beam":
                r = calc_beam(
                    float(el.get("width_m", 0.25)),
                    float(el.get("depth_m", 0.50)),
                    float(el.get("length_m", 6)),
                    qty,
                )
            elif etype == "column":
                r = calc_column(
                    float(el.get("width_m", 0.40)),
                    float(el.get("depth_m", 0.40)),
                    float(el.get("height_m", 3.0)),
                    qty,
                )
            elif etype == "footing":
                r = calc_footing(
                    float(el.get("length_m", 1.5)),
                    float(el.get("width_m", 1.5)),
                    float(el.get("depth_m", 0.50)),
                    qty,
                )
            elif etype == "wall":
                r = calc_wall(
                    float(el.get("length_m", 5)),
                    float(el.get("height_m", 3.0)),
                    float(el.get("thickness_m", 0.20)),
                    qty,
                )
            elif etype == "stair":
                r = calc_stair(
                    float(el.get("floor_to_floor_m", 3.0)),
                    float(el.get("width_m", 1.2)),
                    float(el.get("thickness_m", 0.15)),
                    qty,
                )
            else:
                continue
        except Exception:
            continue

        r["label"] = label
        results.append(r)
        total_concrete_m3 += r["concrete_m3"]
        total_rebar_kg    += r["rebar_kg"]
        total_formwork_m2 += r["formwork_m2"]

    # Material quantities for BOQ
    material_quantities = _structural_materials(
        total_concrete_m3, total_rebar_kg, total_formwork_m2, concrete_class
    )

    return {
        "elements":          results,
        "totals": {
            "concrete_m3":   round(total_concrete_m3, 2),
            "rebar_kg":      round(total_rebar_kg, 1),
            "rebar_tons":    round(total_rebar_kg / 1000, 3),
            "formwork_m2":   round(total_formwork_m2, 2),
        },
        "concrete_class":    concrete_class,
        "rebar_grade":       rebar_grade,
        "material_quantities": material_quantities,
    }


def _structural_materials(
    concrete_m3: float, rebar_kg: float, formwork_m2: float,
    concrete_class: str = "C25 (1:1:2)"
) -> List[Dict]:
    """Generate structural BOQ materials from totals."""
    mats = []

    def add(cat, name, size, unit, qty, notes=""):
        mats.append({
            "category": cat, "material": name, "size": size,
            "unit": unit, "quantity": math.ceil(qty), "notes": notes,
            "discipline": "Structural",
        })

    # Concrete ingredients
    cement_bags   = concrete_m3 * CEMENT_BAGS_PER_M3.get(concrete_class, 10.0)
    sand_m3       = concrete_m3 * SAND_PER_M3.get(concrete_class, 0.35)
    gravel_m3     = concrete_m3 * GRAVEL_PER_M3.get(concrete_class, 0.55)
    water_liter   = concrete_m3 * 180  # ~180 L/m³

    add("Concrete Works", "Portland Cement", "40 kg/bag", "bag", cement_bags,
        f"For {concrete_class} mix")
    add("Concrete Works", "Washed Sand (Fine Aggregate)", "—", "m³", sand_m3, "")
    add("Concrete Works", "Crushed Stone Gravel (Coarse Aggregate)", "—", "m³", gravel_m3, "")

    # Rebar — 12mm and 16mm typical mix (70/30 split)
    rebar_12 = rebar_kg * 0.50
    rebar_16 = rebar_kg * 0.30
    rebar_20 = rebar_kg * 0.20
    kg_per_6m_12 = 0.888 * 6   # kg per 6m bar length
    kg_per_6m_16 = 1.578 * 6
    kg_per_6m_20 = 2.466 * 6

    add("Reinforcement Steel", "Deformed Steel Bar (RSB)", "12mm × 6m", "pcs",
        rebar_12 / kg_per_6m_12, f"{rebar_12:.0f} kg")
    add("Reinforcement Steel", "Deformed Steel Bar (RSB)", "16mm × 6m", "pcs",
        rebar_16 / kg_per_6m_16, f"{rebar_16:.0f} kg")
    add("Reinforcement Steel", "Deformed Steel Bar (RSB)", "20mm × 6m", "pcs",
        rebar_20 / kg_per_6m_20, f"{rebar_20:.0f} kg")

    # Tie wire
    tie_wire_kg = rebar_kg * 0.012   # ~1.2% of rebar weight
    add("Reinforcement Steel", "G.I. Tie Wire", "#16 gauge", "kg", tie_wire_kg, "For rebar binding")

    # Formwork
    add("Formwork", "Phenolic Board (12mm)", "4ft × 8ft", "sheet",
        formwork_m2 / 2.88, "Formwork sheathing (reuse 3×)")
    add("Formwork", "Coco Lumber", "2\" × 3\" × 8ft", "pcs",
        formwork_m2 * 1.5, "Form support")
    add("Formwork", "Common Wire Nails", "3\" CWN", "kg",
        formwork_m2 * 0.3, "Formwork assembly")
    add("Formwork", "Form Oil (Release Agent)", "—", "liter",
        formwork_m2 * 0.15, "")

    # Concrete admixtures
    add("Admixtures", "Water Reducer (Plasticizer)", "—", "liter",
        concrete_m3 * 1.5, "ASTM C494 Type A")

    # Labor
    rough_days  = math.ceil(concrete_m3 * 1.5)
    finish_days = math.ceil(formwork_m2 * 0.05)
    add("Labor", "Structural Works (Concrete Pouring & Finishing)", "N/A", "day",
        rough_days, "Including vibration")
    add("Labor", "Carpentry (Formwork)", "N/A", "day",
        finish_days, "Form erection and stripping")
    add("Labor", "Steel Bar Works (Rebar)", "N/A", "day",
        math.ceil(rebar_kg / 1000 * 3), "Cutting, bending, tying")

    return mats
