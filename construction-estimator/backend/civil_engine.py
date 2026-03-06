"""
Civil Engineering Calculation Engine for EngEst Pro.
Covers: Cut & Fill, Trench Excavation, Road Pavement, Drainage Pipeline, Water/Sewer Pipeline.
All quantities follow standard Philippine construction measurement units.
"""
import math


# ── Cut & Fill ────────────────────────────────────────────────────────────────

def calc_cut_fill(
    area_m2: float,
    cut_depth_m: float,
    fill_depth_m: float,
    swell_factor: float = 1.25,
    compaction_factor: float = 0.85,
) -> dict:
    """
    Mass haul calculation for site grading.

    swell_factor: bank measure → loose measure (typically 1.20–1.30 for common soil)
    compaction_factor: loose fill → compacted fill (typically 0.80–0.90)
    """
    cut_volume_m3 = area_m2 * cut_depth_m                        # bank m³
    fill_volume_m3 = area_m2 * fill_depth_m                      # compacted m³
    loose_cut_m3 = cut_volume_m3 * swell_factor                  # after excavation
    fill_required_loose_m3 = fill_volume_m3 / compaction_factor  # loose needed for fill

    net_export_m3 = max(0.0, loose_cut_m3 - fill_required_loose_m3)
    net_import_m3 = max(0.0, fill_required_loose_m3 - loose_cut_m3)

    material_quantities = [
        {"name": "Earthworks - Excavation (Cut)", "unit": "m³", "quantity": round(cut_volume_m3, 2)},
        {"name": "Earthworks - Compacted Fill", "unit": "m³", "quantity": round(fill_volume_m3, 2)},
    ]
    if net_export_m3 > 0:
        material_quantities.append(
            {"name": "Earthworks - Excess Soil Disposal (Hauling)", "unit": "m³", "quantity": round(net_export_m3, 2)}
        )
    if net_import_m3 > 0:
        material_quantities.append(
            {"name": "Earthworks - Imported Borrow Fill", "unit": "m³", "quantity": round(net_import_m3, 2)}
        )

    return {
        "calc_type": "cut_fill",
        "inputs": {
            "area_m2": area_m2,
            "cut_depth_m": cut_depth_m,
            "fill_depth_m": fill_depth_m,
            "swell_factor": swell_factor,
            "compaction_factor": compaction_factor,
        },
        "results": {
            "cut_volume_m3": round(cut_volume_m3, 2),
            "fill_volume_m3": round(fill_volume_m3, 2),
            "loose_cut_m3": round(loose_cut_m3, 2),
            "fill_required_loose_m3": round(fill_required_loose_m3, 2),
            "net_export_m3": round(net_export_m3, 2),
            "net_import_m3": round(net_import_m3, 2),
        },
        "material_quantities": material_quantities,
        "summary": (
            f"Cut: {cut_volume_m3:.1f} m³ bank | Fill: {fill_volume_m3:.1f} m³ compacted | "
            f"{'Export' if net_export_m3 > 0 else 'Import'}: "
            f"{max(net_export_m3, net_import_m3):.1f} m³ loose"
        ),
    }


# ── Trench Excavation ─────────────────────────────────────────────────────────

def calc_trench(
    length_m: float,
    width_m: float,
    depth_m: float,
    pipe_diameter_mm: float = 0,
    bedding_thickness_m: float = 0.15,
) -> dict:
    """
    Trench excavation for underground utilities.

    Bedding thickness below pipe centerline (default 150mm).
    """
    excavation_m3 = length_m * width_m * depth_m
    bedding_m3 = length_m * width_m * bedding_thickness_m

    # Pipe occupies a cylindrical volume in trench
    pipe_radius_m = (pipe_diameter_mm / 1000) / 2
    pipe_volume_m3 = math.pi * pipe_radius_m ** 2 * length_m if pipe_diameter_mm > 0 else 0.0

    backfill_m3 = max(0.0, excavation_m3 - bedding_m3 - pipe_volume_m3)
    disposal_m3 = excavation_m3 * 1.25 - backfill_m3  # swell factor on excess

    material_quantities = [
        {"name": "Earthworks - Trench Excavation", "unit": "m³", "quantity": round(excavation_m3, 2)},
        {"name": "Granular Bedding (Gravel/Sand)", "unit": "m³", "quantity": round(bedding_m3, 2)},
        {"name": "Earthworks - Trench Backfill (Compacted)", "unit": "m³", "quantity": round(backfill_m3, 2)},
        {"name": "Earthworks - Excess Soil Disposal (Hauling)", "unit": "m³", "quantity": round(max(0, disposal_m3), 2)},
    ]

    return {
        "calc_type": "trench",
        "inputs": {
            "length_m": length_m,
            "width_m": width_m,
            "depth_m": depth_m,
            "pipe_diameter_mm": pipe_diameter_mm,
            "bedding_thickness_m": bedding_thickness_m,
        },
        "results": {
            "excavation_m3": round(excavation_m3, 2),
            "bedding_m3": round(bedding_m3, 2),
            "pipe_volume_m3": round(pipe_volume_m3, 3),
            "backfill_m3": round(backfill_m3, 2),
            "disposal_m3": round(max(0, disposal_m3), 2),
        },
        "material_quantities": material_quantities,
        "summary": (
            f"Excavation: {excavation_m3:.1f} m³ | "
            f"Backfill: {backfill_m3:.1f} m³ | "
            f"Bedding: {bedding_m3:.1f} m³"
        ),
    }


# ── Road Pavement ─────────────────────────────────────────────────────────────

def calc_road(
    length_m: float,
    carriageway_width_m: float,
    base_thickness_m: float = 0.20,
    subbase_thickness_m: float = 0.30,
    pavement_thickness_m: float = 0.15,
    shoulder_width_m: float = 1.0,
) -> dict:
    """
    Road pavement layer quantities.

    Layers (bottom to top): Subgrade → Subbase → Base Course → Wearing Course (pavement)
    """
    total_width_m = carriageway_width_m + (2 * shoulder_width_m)
    subgrade_area_m2 = length_m * total_width_m
    subbase_m3 = length_m * total_width_m * subbase_thickness_m
    base_m3 = length_m * carriageway_width_m * base_thickness_m
    wearing_course_m2 = length_m * carriageway_width_m
    wearing_course_m3 = wearing_course_m2 * pavement_thickness_m

    # Shoulder: granular fill
    shoulder_m3 = length_m * (2 * shoulder_width_m) * (subbase_thickness_m + base_thickness_m)

    material_quantities = [
        {"name": "Earthworks - Subgrade Preparation", "unit": "m²", "quantity": round(subgrade_area_m2, 2)},
        {"name": "Aggregate Subbase Course", "unit": "m³", "quantity": round(subbase_m3, 2)},
        {"name": "Aggregate Base Course", "unit": "m³", "quantity": round(base_m3, 2)},
        {"name": "Concrete Pavement (Wearing Course)", "unit": "m²", "quantity": round(wearing_course_m2, 2)},
        {"name": "Concrete Pavement (Wearing Course)", "unit": "m³", "quantity": round(wearing_course_m3, 2)},
        {"name": "Granular Shoulder Fill", "unit": "m³", "quantity": round(shoulder_m3, 2)},
    ]

    return {
        "calc_type": "road",
        "inputs": {
            "length_m": length_m,
            "carriageway_width_m": carriageway_width_m,
            "base_thickness_m": base_thickness_m,
            "subbase_thickness_m": subbase_thickness_m,
            "pavement_thickness_m": pavement_thickness_m,
            "shoulder_width_m": shoulder_width_m,
        },
        "results": {
            "total_width_m": round(total_width_m, 2),
            "subgrade_area_m2": round(subgrade_area_m2, 2),
            "subbase_m3": round(subbase_m3, 2),
            "base_m3": round(base_m3, 2),
            "wearing_course_m2": round(wearing_course_m2, 2),
            "wearing_course_m3": round(wearing_course_m3, 2),
            "shoulder_m3": round(shoulder_m3, 2),
        },
        "material_quantities": material_quantities,
        "summary": (
            f"Road: {length_m:.0f}m × {carriageway_width_m:.1f}m | "
            f"Subbase: {subbase_m3:.1f} m³ | "
            f"Base: {base_m3:.1f} m³ | "
            f"Pavement: {wearing_course_m2:.0f} m²"
        ),
    }


# ── Drainage Pipeline ─────────────────────────────────────────────────────────

def calc_drainage(
    length_m: float,
    pipe_diameter_mm: float,
    trench_width_m: float = 0.8,
    manhole_spacing_m: float = 50.0,
    cover_depth_m: float = 1.0,
    pipe_material: str = "RCCP",  # Reinforced Concrete Culvert Pipe | HDPE | PVC
) -> dict:
    """
    Stormwater / sewer drainage pipeline quantities.
    """
    trench_result = calc_trench(length_m, trench_width_m, cover_depth_m, pipe_diameter_mm)

    num_manholes = math.ceil(length_m / manhole_spacing_m) + 1

    material_quantities = [
        {
            "name": f"{pipe_material} Culvert/Drainage Pipe Ø{int(pipe_diameter_mm)}mm",
            "unit": "m",
            "quantity": round(length_m, 2),
        },
        {"name": "Drainage Manhole (Precast Concrete)", "unit": "pc", "quantity": num_manholes},
        {"name": "Earthworks - Trench Excavation", "unit": "m³", "quantity": trench_result["results"]["excavation_m3"]},
        {"name": "Granular Bedding (Gravel/Sand)", "unit": "m³", "quantity": trench_result["results"]["bedding_m3"]},
        {"name": "Earthworks - Trench Backfill (Compacted)", "unit": "m³", "quantity": trench_result["results"]["backfill_m3"]},
        {"name": "Earthworks - Excess Soil Disposal (Hauling)", "unit": "m³", "quantity": trench_result["results"]["disposal_m3"]},
    ]

    return {
        "calc_type": "drainage",
        "inputs": {
            "length_m": length_m,
            "pipe_diameter_mm": pipe_diameter_mm,
            "trench_width_m": trench_width_m,
            "manhole_spacing_m": manhole_spacing_m,
            "cover_depth_m": cover_depth_m,
            "pipe_material": pipe_material,
        },
        "results": {
            "pipe_length_m": round(length_m, 2),
            "num_manholes": num_manholes,
            **trench_result["results"],
        },
        "material_quantities": material_quantities,
        "summary": (
            f"Drainage: {length_m:.0f}m Ø{int(pipe_diameter_mm)}mm {pipe_material} | "
            f"{num_manholes} manholes"
        ),
    }


# ── Water / Sewer Pipeline ────────────────────────────────────────────────────

PIPE_FITTINGS_FACTOR = {
    "ductile_iron": 0.08,   # 8% of pipe length value for fittings
    "pvc": 0.10,
    "hdpe": 0.08,
    "rccp": 0.05,
    "steel": 0.12,
}

def calc_pipeline(
    length_m: float,
    pipe_diameter_mm: float,
    pipe_material: str = "ductile_iron",  # ductile_iron | pvc | hdpe | steel
    trench_width_m: float = 1.0,
    depth_m: float = 1.5,
    thrust_block_spacing_m: float = 100.0,
) -> dict:
    """
    Water supply or sewer pressure pipeline quantities.
    """
    trench_result = calc_trench(length_m, trench_width_m, depth_m, pipe_diameter_mm)
    num_thrust_blocks = max(1, math.ceil(length_m / thrust_block_spacing_m))

    fittings_factor = PIPE_FITTINGS_FACTOR.get(pipe_material, 0.10)
    # Approximate fittings count based on % of linear length
    num_fittings = max(2, round(length_m * fittings_factor / 10))  # joints/couplings every ~10m

    material_quantities = [
        {
            "name": f"{pipe_material.replace('_', ' ').title()} Pipe Ø{int(pipe_diameter_mm)}mm",
            "unit": "m",
            "quantity": round(length_m * 1.03, 2),  # 3% waste
        },
        {
            "name": f"Pipeline Fittings (Elbows, Tees, Reducers) Ø{int(pipe_diameter_mm)}mm",
            "unit": "lot",
            "quantity": num_fittings,
        },
        {"name": "Concrete Thrust Block", "unit": "pc", "quantity": num_thrust_blocks},
        {"name": "Earthworks - Trench Excavation", "unit": "m³", "quantity": trench_result["results"]["excavation_m3"]},
        {"name": "Granular Bedding (Gravel/Sand)", "unit": "m³", "quantity": trench_result["results"]["bedding_m3"]},
        {"name": "Earthworks - Trench Backfill (Compacted)", "unit": "m³", "quantity": trench_result["results"]["backfill_m3"]},
        {"name": "Earthworks - Excess Soil Disposal (Hauling)", "unit": "m³", "quantity": trench_result["results"]["disposal_m3"]},
    ]

    return {
        "calc_type": "pipeline",
        "inputs": {
            "length_m": length_m,
            "pipe_diameter_mm": pipe_diameter_mm,
            "pipe_material": pipe_material,
            "trench_width_m": trench_width_m,
            "depth_m": depth_m,
            "thrust_block_spacing_m": thrust_block_spacing_m,
        },
        "results": {
            "pipe_length_m": round(length_m * 1.03, 2),
            "num_fittings": num_fittings,
            "num_thrust_blocks": num_thrust_blocks,
            **trench_result["results"],
        },
        "material_quantities": material_quantities,
        "summary": (
            f"Pipeline: {length_m:.0f}m Ø{int(pipe_diameter_mm)}mm "
            f"{pipe_material.replace('_', ' ').title()} | "
            f"{num_thrust_blocks} thrust blocks"
        ),
    }


# ── Dispatcher ────────────────────────────────────────────────────────────────

def run_civil_calculation(calc_type: str, inputs: dict) -> dict:
    """Route to the correct engine function based on calc_type."""
    dispatch = {
        "cut_fill": calc_cut_fill,
        "trench":   calc_trench,
        "road":     calc_road,
        "drainage": calc_drainage,
        "pipeline": calc_pipeline,
    }
    fn = dispatch.get(calc_type)
    if not fn:
        raise ValueError(f"Unknown calc_type: '{calc_type}'. Must be one of {list(dispatch)}")
    return fn(**inputs)
