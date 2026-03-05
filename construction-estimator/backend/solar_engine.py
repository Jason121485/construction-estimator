"""
Solar PV System Design Engine
Based on Philippine solar irradiance data and industry standards.
Handles system sizing, string design, inverter/battery selection.
"""
import math
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Philippine Solar Data — Peak Sun Hours (PSH) by region
# ---------------------------------------------------------------------------
PHILIPPINE_PSH = {
    "Metro Manila":     4.5,
    "Cebu":             5.0,
    "Davao":            5.2,
    "Iloilo":           4.8,
    "Cagayan de Oro":   5.1,
    "Baguio":           3.8,
    "Batangas":         4.7,
    "Pampanga":         4.6,
    "Laguna":           4.5,
    "Quezon":           4.4,
    "General (Luzon)":  4.5,
    "General (Visayas)": 5.0,
    "General (Mindanao)": 5.2,
}
DEFAULT_PSH = 4.5

# Standard PV module wattages (Wp)
PANEL_WATTAGES = [250, 270, 300, 330, 350, 380, 400, 450, 500, 540, 600, 665, 700]

# Standard inverter sizes (kW)
INVERTER_SIZES_KW = [1.0, 1.5, 2.0, 3.0, 3.6, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0,
                     15.0, 17.5, 20.0, 25.0, 30.0, 40.0, 50.0, 60.0, 80.0, 100.0]

# Standard battery capacities (kWh)
BATTERY_SIZES_KWH = [2.4, 5.0, 7.5, 10.0, 12.5, 15.0, 20.0, 25.0, 30.0, 40.0, 50.0, 100.0]

# Battery types and depth of discharge
BATTERY_DOD = {
    "Lead Acid":        0.50,
    "AGM":              0.60,
    "Lithium (LFP)":    0.90,
    "Lithium (NMC)":    0.85,
}

# System performance ratio (accounts for temperature, wiring, inverter losses)
PERFORMANCE_RATIO = 0.80

# Typical panel dimensions (m²)
PANEL_AREA_M2 = 2.0   # Standard 60/72-cell panel ~1.9–2.1 m²

# System types
SYSTEM_TYPES = {
    "grid_tied":    "Grid-Tied (No Battery)",
    "off_grid":     "Off-Grid / Standalone",
    "hybrid":       "Hybrid (Grid + Battery Backup)",
}


# ---------------------------------------------------------------------------
# Helper selectors
# ---------------------------------------------------------------------------
def select_inverter_kw(required_kw: float, buffer: float = 1.20) -> float:
    target = required_kw * buffer
    for s in INVERTER_SIZES_KW:
        if s >= target:
            return s
    return INVERTER_SIZES_KW[-1]


def select_battery_kWh(required_kwh: float) -> float:
    for b in BATTERY_SIZES_KWH:
        if b >= required_kwh:
            return b
    return BATTERY_SIZES_KWH[-1]


def get_psh(location: str) -> float:
    return PHILIPPINE_PSH.get(location, DEFAULT_PSH)


# ---------------------------------------------------------------------------
# Solar System Sizing
# ---------------------------------------------------------------------------
def perform_solar_analysis(
    monthly_kwh: float,
    location: str = "General (Luzon)",
    panel_wattage_wp: float = 400,
    battery_type: str = "Lithium (LFP)",
    backup_hours: float = 4.0,
    system_type: str = "grid_tied",
    roof_area_m2: Optional[float] = None,
    power_factor: float = 0.90,
) -> Dict:
    """
    Full solar PV system sizing.

    Args:
        monthly_kwh:      Monthly energy consumption in kWh
        location:         Project location (for PSH lookup)
        panel_wattage_wp: Selected PV panel wattage in Wp
        battery_type:     Battery chemistry for DOD selection
        backup_hours:     Hours of backup power (off-grid/hybrid)
        system_type:      grid_tied | off_grid | hybrid
        roof_area_m2:     Available roof area (optional constraint)
        power_factor:     System power factor

    Returns:
        Complete sizing results with material quantities.
    """
    # Energy analysis
    daily_kwh    = monthly_kwh / 30
    psh          = get_psh(location)

    # Required PV capacity
    system_kw_required = daily_kwh / (psh * PERFORMANCE_RATIO)

    # Number of panels
    panel_kw     = panel_wattage_wp / 1000
    num_panels   = math.ceil(system_kw_required / panel_kw)
    actual_kw    = num_panels * panel_kw

    # String design (MPPT strings of 10–14 panels each, typical residential)
    panels_per_string = 12 if actual_kw <= 10 else 14
    num_strings  = math.ceil(num_panels / panels_per_string)
    # Adjust panels to fill strings evenly
    num_panels   = num_strings * panels_per_string
    actual_kw    = num_panels * panel_kw

    # Inverter sizing
    inverter_kw  = select_inverter_kw(actual_kw)

    # Energy production estimate
    daily_production_kwh  = actual_kw * psh * PERFORMANCE_RATIO
    monthly_production_kwh = daily_production_kwh * 30
    annual_production_kwh  = daily_production_kwh * 365

    # Roof area check
    required_roof_m2 = num_panels * PANEL_AREA_M2
    roof_ok          = (roof_area_m2 is None) or (roof_area_m2 >= required_roof_m2)

    # Battery sizing (for off_grid and hybrid only)
    battery_result = None
    if system_type in ("off_grid", "hybrid"):
        dod              = BATTERY_DOD.get(battery_type, 0.80)
        critical_kwh     = daily_kwh * (backup_hours / 24)
        required_batt_kwh = critical_kwh / dod
        selected_batt_kwh = select_battery_kWh(required_batt_kwh)
        num_battery_units = math.ceil(required_batt_kwh / max(1, 5.0))  # assume 5 kWh modules

        battery_result = {
            "backup_hours":         backup_hours,
            "battery_type":         battery_type,
            "dod":                  dod,
            "required_kwh":         round(required_batt_kwh, 2),
            "selected_kwh":         selected_batt_kwh,
            "num_units":            num_battery_units,
            "unit_kwh":             round(selected_batt_kwh / num_battery_units, 2),
        }

    # Financial estimates (Philippine market)
    panel_cost_php  = num_panels * panel_wattage_wp * 30   # ~₱30/Wp for panels
    inverter_cost   = inverter_kw * 15000                   # ~₱15,000/kW
    bos_cost        = actual_kw * 20000                     # Balance of System ~₱20k/kW
    battery_cost    = 0
    if battery_result:
        battery_cost = battery_result["selected_kwh"] * 12000  # ~₱12,000/kWh
    install_cost    = actual_kw * 8000                      # ~₱8,000/kW labor
    total_cost      = panel_cost_php + inverter_cost + bos_cost + battery_cost + install_cost

    # Simple payback (assuming ₱12/kWh meralco rate)
    electric_rate   = 12.0  # ₱/kWh
    annual_savings  = annual_production_kwh * electric_rate
    payback_years   = total_cost / annual_savings if annual_savings > 0 else 0

    # CO₂ offset (0.65 kg CO₂ per kWh — Philippine grid factor)
    annual_co2_kg   = annual_production_kwh * 0.65

    # Material quantities
    material_quantities = _solar_materials(
        num_panels, panel_wattage_wp, inverter_kw, battery_result, num_strings, actual_kw
    )

    return {
        "system_type":        system_type,
        "location":           location,
        "peak_sun_hours":     psh,
        "performance_ratio":  PERFORMANCE_RATIO,
        "energy": {
            "monthly_consumption_kwh":    monthly_kwh,
            "daily_consumption_kwh":      round(daily_kwh, 2),
            "daily_production_kwh":       round(daily_production_kwh, 2),
            "monthly_production_kwh":     round(monthly_production_kwh, 1),
            "annual_production_kwh":      round(annual_production_kwh, 0),
        },
        "pv_array": {
            "required_kw":          round(system_kw_required, 2),
            "actual_kw":            round(actual_kw, 2),
            "num_panels":           num_panels,
            "panel_wattage_wp":     panel_wattage_wp,
            "num_strings":          num_strings,
            "panels_per_string":    panels_per_string,
            "required_roof_m2":     round(required_roof_m2, 1),
            "roof_area_ok":         roof_ok,
        },
        "inverter": {
            "required_kw":   round(actual_kw * 1.20, 1),
            "selected_kw":   inverter_kw,
            "type":          "String Inverter" if inverter_kw <= 20 else "Central Inverter",
            "mppt_inputs":   num_strings,
        },
        "battery":  battery_result,
        "financials": {
            "panel_cost":        round(panel_cost_php),
            "inverter_cost":     round(inverter_cost),
            "bos_cost":          round(bos_cost),
            "battery_cost":      round(battery_cost),
            "installation_cost": round(install_cost),
            "total_cost":        round(total_cost),
            "annual_savings_php": round(annual_savings),
            "payback_years":     round(payback_years, 1),
            "annual_co2_offset_kg": round(annual_co2_kg),
        },
        "material_quantities": material_quantities,
    }


def _solar_materials(
    num_panels: int,
    panel_wp: float,
    inverter_kw: float,
    battery_result: Optional[Dict],
    num_strings: int,
    system_kw: float,
) -> List[Dict]:
    """Generate solar installation bill of materials."""
    mats = []

    def add(cat, name, size, unit, qty, notes=""):
        mats.append({
            "category": cat, "material": name, "size": size,
            "unit": unit, "quantity": math.ceil(qty), "notes": notes,
            "discipline": "Solar",
        })

    # PV Modules
    add("PV Module", "Monocrystalline Solar Panel", f"{int(panel_wp)}Wp", "unit",
        num_panels, f"{system_kw:.1f} kWp total array")

    # Inverter
    add("Inverter", "String Inverter / Hybrid Inverter", f"{inverter_kw}kW", "unit",
        1, "Grid-compatible, IP65 rated")

    # Mounting system
    add("Mounting", "Aluminum Rail (Mounting Rail)", "40mm × 40mm × 4.2m", "pcs",
        math.ceil(num_panels * 2 / 4.2 * 0.85), "Roof-mount rail")
    add("Mounting", "Stainless Mid Clamp",   "35mm",   "pcs", num_panels * 2, "Module mid clamps")
    add("Mounting", "Stainless End Clamp",   "35mm",   "pcs", num_panels * 2 + 4, "Module end clamps")
    add("Mounting", "Roof Hook / L-Bracket", "Galv.",  "pcs", math.ceil(num_panels * 3), "")
    add("Mounting", "M8 Stainless Bolt Set", "M8×20",  "set", math.ceil(num_panels * 4), "")

    # DC wiring
    dc_cable_m = num_strings * 30 * 2   # 30m per string × 2 conductors
    add("DC Wiring", "PV Wire / Solar Cable", "4mm² (12AWG)", "meter",
        dc_cable_m, "DC string wiring")
    add("DC Wiring", "MC4 Connector Pair",   "30A",          "pair",  num_strings * 4, "")
    add("DC Wiring", "MC4 Branch Connector (Y)", "2-in-1",   "pcs",   num_strings * 2, "String combiner")
    add("DC Wiring", "DC Circuit Breaker",   f"{int(system_kw / num_strings * 1.5 * 10) or 15}A",
        "pcs", num_strings, "Per string overcurrent protection")
    add("DC Wiring", "DC Surge Protection Device (SPD)", "600V DC", "unit", 1, "Array SPD")
    add("DC Wiring", "PV Combiner Box",      f"{num_strings}-string", "unit", 1, "")

    # AC wiring
    ac_cable_m = 20  # inverter to AC panel
    add("AC Wiring", "THHN Copper Wire", "5.5mm²", "meter",
        ac_cable_m * 3, "AC output wiring (L+N+G)")
    add("AC Wiring", "AC Circuit Breaker (2-pole)", f"{int(inverter_kw * 6)}A", "pcs",
        1, "AC disconnect / protection")
    add("AC Wiring", "AC Surge Protection Device",  "275V AC", "unit", 1, "")

    # Battery (if applicable)
    if battery_result:
        add("Battery", "Lithium Battery Bank", f"{battery_result['selected_kwh']}kWh",
            "unit", battery_result["num_units"],
            f"{battery_result['battery_type']} chemistry")
        add("Battery", "Battery Management System (BMS)", "—", "unit", 1, "")
        add("Battery", "Battery Cable (Copper)", "35mm²", "meter",
            battery_result["num_units"] * 2, "Battery interconnect")

    # Monitoring
    add("Monitoring", "Solar Monitoring System (WiFi Logger)", "—", "unit", 1, "Energy monitoring")

    # Conduit and cable management
    add("Conduit", "PVC Rigid Conduit", '3/4"', "length",
        math.ceil(dc_cable_m / 3), "DC cable conduit")
    add("Conduit", "Cable Tray (Perforated)", "100mm wide", "meter", 5, "Equipment room")

    # Grounding
    add("Grounding", "Ground Rod (Copper-Clad)", '5/8"×8ft', "pcs", 2, "System earthing")
    add("Grounding", "THHN Green Ground Wire", "5.5mm²", "meter", 30, "Equipment grounding")
    add("Grounding", "Ground Bar", "12-hole", "pcs", 1, "")

    # Installation labor
    add("Labor", "Solar Installation Labor", "—", "day",
        math.ceil(num_panels / 10), "Panel mounting, wiring, commissioning")

    return mats
