"""
Electrical System Design & Estimation Engine
Based on Philippine Electrical Code (PEC) and NEC standards.
Handles load calculation, cable/breaker sizing, transformer/generator sizing.
"""
import math
from typing import List, Dict, Any, Optional

# ---------------------------------------------------------------------------
# Philippine Electrical Code Constants
# ---------------------------------------------------------------------------
VOLTAGE_SP  = 220.0   # Single-phase supply (V)
VOLTAGE_3P  = 380.0   # Three-phase supply (V) — line-to-line
FREQUENCY   = 60      # Hz

# THHN/THWN Copper Wire Ampacity (mm²)
# PEC Table 3.10.1.1 — 75°C conductors in conduit, ≤3 conductors, 30°C ambient
WIRE_AMPACITY: Dict[str, float] = {
    "1.5":  15,
    "2.0":  20,
    "3.5":  25,
    "5.5":  35,
    "8.0":  45,
    "14":   65,
    "22":   90,
    "30":   110,
    "38":   130,
    "50":   160,
    "60":   185,
    "80":   215,
    "100":  260,
    "125":  300,
    "150":  340,
    "200":  395,
}
WIRE_SIZES_MM2 = [1.5, 2.0, 3.5, 5.5, 8.0, 14, 22, 30, 38, 50, 60, 80, 100, 125, 150, 200]

# Standard molded case circuit breaker (MCCB/MCB) sizes
BREAKER_SIZES = [10, 15, 20, 30, 40, 50, 60, 70, 80, 100, 125, 150, 175, 200,
                 225, 250, 300, 350, 400, 500, 600, 800, 1000, 1200, 1600, 2000]

# Standard transformer kVA ratings (Philippine distribution)
TRANSFORMER_SIZES_KVA = [10, 15, 25, 37.5, 50, 75, 100, 167, 250, 333, 500, 750, 1000, 1500, 2000]

# Standard generator / genset kVA ratings
GENERATOR_SIZES_KVA = [5, 7.5, 10, 15, 20, 25, 30, 50, 75, 100, 125, 150, 200, 250, 300, 500, 750, 1000]

# Copper resistivity (Ω·m)
COPPER_RESISTIVITY = 1.72e-8

# Typical load demand factors by type
DEMAND_FACTOR_TABLE = {
    "Lighting":          0.80,
    "Convenience Outlet": 0.50,
    "Air Conditioning":  1.00,
    "Motors":            0.75,
    "Electric Water Heater": 1.00,
    "Refrigeration":     0.75,
    "Computers/IT":      0.80,
    "Elevator":          0.50,
    "General":           0.80,
}

# NEC 250.122 / PEC — Equipment grounding conductor sizing
GROUND_WIRE_TABLE = [
    (15,   1.5),
    (20,   2.0),
    (60,   3.5),
    (100,  5.5),
    (200,  8.0),
    (300,  14),
    (400,  22),
    (600,  30),
    (800,  38),
    (1000, 50),
    (1200, 60),
]


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------
def select_wire_size(current_a: float, safety_factor: float = 1.25) -> str:
    """Return the smallest THHN wire size with ampacity ≥ current × safety_factor."""
    required = current_a * safety_factor
    for size in WIRE_SIZES_MM2:
        key = str(int(size)) if size >= 14 else f"{size}"
        amp = WIRE_AMPACITY.get(key, 0)
        if amp >= required:
            return key
    return "200"


def select_breaker_size(current_a: float, continuous: bool = True) -> int:
    """Return next standard breaker ≥ current × 1.25 (continuous loads per PEC)."""
    required = current_a * (1.25 if continuous else 1.0)
    for b in BREAKER_SIZES:
        if b >= required:
            return b
    return BREAKER_SIZES[-1]


def calc_current_1ph(kw: float, voltage: float = VOLTAGE_SP, pf: float = 0.85) -> float:
    """Single-phase current in amperes."""
    if voltage <= 0 or pf <= 0:
        return 0.0
    return (kw * 1000) / (voltage * pf)


def calc_current_3ph(kw: float, voltage: float = VOLTAGE_3P, pf: float = 0.85) -> float:
    """Three-phase current in amperes (line current)."""
    if voltage <= 0 or pf <= 0:
        return 0.0
    return (kw * 1000) / (math.sqrt(3) * voltage * pf)


def calc_voltage_drop_pct(
    current_a: float, wire_size_mm2: float, length_m: float,
    voltage: float = VOLTAGE_SP, num_conductors: int = 2
) -> float:
    """
    Voltage drop percentage using resistivity formula.
    VD% = (ρ × N × L × I) / (A × V) × 100
    ρ = 1.72e-8 Ω·m (copper), A in m²
    """
    if wire_size_mm2 <= 0 or voltage <= 0 or length_m <= 0:
        return 0.0
    A = wire_size_mm2 * 1e-6
    vd = (COPPER_RESISTIVITY * num_conductors * length_m * current_a) / (A * voltage)
    return round(vd * 100, 2)


def select_ground_wire(main_breaker_a: int) -> str:
    for thresh, size in GROUND_WIRE_TABLE:
        if main_breaker_a <= thresh:
            return str(size) if size >= 14 else f"{size}"
    return "60"


def select_transformer_kva(required_kva: float, buffer: float = 1.25) -> float:
    target = required_kva * buffer
    for t in TRANSFORMER_SIZES_KVA:
        if t >= target:
            return t
    return TRANSFORMER_SIZES_KVA[-1]


def select_generator_kva(required_kva: float, buffer: float = 1.25) -> float:
    target = required_kva * buffer
    for g in GENERATOR_SIZES_KVA:
        if g >= target:
            return g
    return GENERATOR_SIZES_KVA[-1]


# ---------------------------------------------------------------------------
# Circuit Analysis
# ---------------------------------------------------------------------------
def analyze_circuit(
    name: str,
    load_type: str,
    quantity: int,
    watts_per_unit: float,
    demand_factor: Optional[float],
    cable_length_m: float,
    supply_phase: str = "single",
    voltage: float = VOLTAGE_SP,
    power_factor: float = 0.85,
) -> Dict:
    """Analyze a single branch circuit."""
    df = demand_factor if demand_factor is not None else DEMAND_FACTOR_TABLE.get(load_type, 0.8)
    connected_kw = (quantity * watts_per_unit) / 1000
    demand_kw    = connected_kw * df

    num_cond = 2 if supply_phase == "single" else 3
    if supply_phase == "single":
        current_a = calc_current_1ph(demand_kw, voltage, power_factor)
    else:
        current_a = calc_current_3ph(demand_kw, voltage, power_factor)

    wire_size  = select_wire_size(current_a)
    breaker_a  = select_breaker_size(current_a)

    wire_size_float = float(wire_size.replace(".", "")) if "." not in wire_size else float(wire_size)
    vd_pct     = calc_voltage_drop_pct(current_a, float(wire_size), cable_length_m, voltage, num_cond)
    vd_ok      = vd_pct <= 3.0

    return {
        "circuit_name":    name,
        "load_type":       load_type,
        "quantity":        quantity,
        "watts_per_unit":  watts_per_unit,
        "demand_factor":   df,
        "connected_kw":    round(connected_kw, 3),
        "demand_kw":       round(demand_kw, 3),
        "current_a":       round(current_a, 2),
        "wire_size_mm2":   wire_size,
        "breaker_a":       breaker_a,
        "cable_length_m":  cable_length_m,
        "voltage_drop_pct": vd_pct,
        "voltage_drop_ok": vd_ok,
        "supply_phase":    supply_phase,
    }


# ---------------------------------------------------------------------------
# Full Electrical Analysis
# ---------------------------------------------------------------------------
def perform_electrical_analysis(
    circuits: List[Dict],
    supply_phase: str = "single",
    power_factor: float = 0.85,
    supply_voltage: float = VOLTAGE_SP,
    cable_length_m: float = 30.0,
    critical_load_pct: float = 0.60,
    diversity_factor: float = 0.80,
    building_type: str = "Residential",
) -> Dict:
    """
    Full electrical system design and estimation.

    Returns:
        panel_schedule, total loads, transformer/generator sizing,
        grounding design, material quantities.
    """
    voltage = supply_voltage or (VOLTAGE_SP if supply_phase == "single" else VOLTAGE_3P)

    # Analyze each circuit
    analyzed_circuits = []
    total_connected_kw = 0.0
    total_demand_kw    = 0.0

    for c in circuits:
        result = analyze_circuit(
            name         = c.get("name", "Circuit"),
            load_type    = c.get("load_type", "General"),
            quantity     = int(c.get("quantity", 1)),
            watts_per_unit = float(c.get("watts_per_unit", 0)),
            demand_factor  = c.get("demand_factor"),
            cable_length_m = float(c.get("cable_length_m", cable_length_m)),
            supply_phase   = supply_phase,
            voltage        = voltage,
            power_factor   = power_factor,
        )
        analyzed_circuits.append(result)
        total_connected_kw += result["connected_kw"]
        total_demand_kw    += result["demand_kw"]

    # Service entrance / main panel sizing
    diversity_demand_kw = total_demand_kw * diversity_factor
    if supply_phase == "single":
        main_current_a = calc_current_1ph(diversity_demand_kw, voltage, power_factor)
    else:
        main_current_a = calc_current_3ph(diversity_demand_kw, voltage, power_factor)

    main_breaker_a  = select_breaker_size(main_current_a)
    main_wire_size  = select_wire_size(main_current_a)
    ground_wire_mm2 = select_ground_wire(main_breaker_a)

    # Transformer sizing
    demand_kva      = diversity_demand_kw / power_factor
    transformer_kva = select_transformer_kva(demand_kva)

    # Generator sizing (critical loads only)
    critical_kw     = diversity_demand_kw * critical_load_pct
    critical_kva    = critical_kw / power_factor
    generator_kva   = select_generator_kva(critical_kva)

    # Voltage drop on main feeder (assume 50m feeder run)
    feeder_len = 50.0
    num_cond   = 2 if supply_phase == "single" else 3
    main_vd_pct = calc_voltage_drop_pct(
        main_current_a, float(main_wire_size), feeder_len, voltage, num_cond
    )

    # Material quantity estimates
    materials = _estimate_electrical_materials(analyzed_circuits, main_wire_size, ground_wire_mm2, supply_phase)

    return {
        "summary": {
            "total_connected_kw":   round(total_connected_kw, 2),
            "total_demand_kw":      round(total_demand_kw, 2),
            "diversity_demand_kw":  round(diversity_demand_kw, 2),
            "power_factor":         power_factor,
            "supply_phase":         supply_phase,
            "supply_voltage":       voltage,
            "total_connected_kva":  round(total_connected_kw / power_factor, 2),
            "total_demand_kva":     round(demand_kva, 2),
        },
        "panel_schedule": analyzed_circuits,
        "service_entrance": {
            "main_current_a":    round(main_current_a, 1),
            "main_breaker_a":    main_breaker_a,
            "main_wire_size_mm2": main_wire_size,
            "feeder_vd_pct":     main_vd_pct,
            "feeder_vd_ok":      main_vd_pct <= 2.0,
        },
        "transformer": {
            "required_kva":   round(demand_kva, 1),
            "selected_kva":   transformer_kva,
            "type":           "Pad-mounted Distribution" if transformer_kva >= 167 else "Pole-mounted Distribution",
            "primary_voltage": 13200,  # MERALCO distribution voltage
            "secondary_voltage": int(voltage),
        },
        "generator": {
            "critical_load_kw":  round(critical_kw, 1),
            "required_kva":      round(critical_kva, 1),
            "selected_kva":      generator_kva,
            "type":              "Standby Diesel Generator",
        },
        "grounding": {
            "ground_wire_mm2":  ground_wire_mm2,
            "ground_rod_type":  "Copper-Clad Steel 5/8\" × 8ft",
            "min_ground_rods":  2,
            "electrode_system": "Driven Rod System (PEC Section 2.50)",
        },
        "material_quantities": materials,
    }


def _estimate_electrical_materials(
    circuits: List[Dict],
    main_wire_size: str,
    ground_wire_mm2: str,
    supply_phase: str,
) -> List[Dict]:
    """Generate electrical bill of materials from circuit analysis."""
    mats = []

    def add(cat, name, size, unit, qty, notes=""):
        mats.append({
            "category": cat, "material": name, "size": size,
            "unit": unit, "quantity": math.ceil(qty), "notes": notes,
            "discipline": "Electrical",
        })

    # Aggregate wire by size
    wire_lengths: Dict[str, float] = {}
    breaker_counts: Dict[int, int] = {}
    conduit_length = 0.0

    for c in circuits:
        sz   = c["wire_size_mm2"]
        ln   = c.get("cable_length_m", 30) * (3 if supply_phase == "three" else 2)
        wire_lengths[sz] = wire_lengths.get(sz, 0) + ln
        conduit_length  += c.get("cable_length_m", 30)
        ba = c["breaker_a"]
        breaker_counts[ba] = breaker_counts.get(ba, 0) + 1

    # Branch circuit wires
    for sz, length_m in wire_lengths.items():
        add("Electrical Wire", "THHN Copper Wire", f"{sz}mm²", "meter", length_m, "Branch circuits")

    # Main feeder wire
    n_cond = 3 if supply_phase == "three" else 2
    add("Electrical Wire", "THHN Copper Wire", f"{main_wire_size}mm²", "meter",
        60 * n_cond, "Main feeder")
    add("Electrical Wire", "THHN Copper Wire", f"{ground_wire_mm2}mm²", "meter",
        60, "Equipment grounding conductor")

    # Breakers
    for amps, count in breaker_counts.items():
        add("Circuit Breaker", f"MCB {amps}A", f"{amps}A", "pcs", count, "Branch circuit breakers")

    # Main breaker determined from service entrance calculation
    add("Circuit Breaker", "MCCB (Main)", f"{len(circuits)*20 + 60}A", "pcs", 1, "Main circuit breaker")

    # Load center / panel board
    n_circuits = len(circuits)
    panel_size = max(12, math.ceil(n_circuits / 12) * 12)
    add("Panel Board", "Load Center", f"{panel_size}-circuit", "unit", 1, "Distribution panel")

    # Conduit (EMT)
    add("Conduit", "EMT Pipe", '3/4"', "length", conduit_length / 3, "Branch circuit conduit")
    add("Conduit", "EMT Pipe", '1"',   "length", 10, "Main feeder conduit")

    # Conduit fittings (1 connector + 1 coupler per length)
    add("Conduit Fitting", "EMT Connector", '3/4"', "pcs", conduit_length / 3, "")
    add("Conduit Fitting", "EMT Coupler",   '3/4"', "pcs", conduit_length / 6, "")

    # Junction boxes
    add("Outlet Box", "Junction Box (2×4)", "Standard", "pcs", n_circuits * 2, "")

    # Outlets and switches (1 outlet per circuit assumed)
    add("Outlet/Switch", "Convenience Outlet", "15A/250V", "pcs", n_circuits, "")
    add("Outlet/Switch", "Single Pole Switch",  "15A/250V", "pcs",
        max(1, len([c for c in circuits if c["load_type"] == "Lighting"])), "Lighting switches")

    # Grounding
    add("Grounding", "Ground Rod (Copper-Clad)", '5/8"×8ft', "pcs", 2, "Electrode system")
    add("Grounding", "Ground Rod Clamp",         '5/8"',      "pcs", 2, "")

    return mats
