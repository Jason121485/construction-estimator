"""
Initial material price database.
Philippine market prices (₱) — reference: TheProjectEstimate.com, Philcon Prices.
Covers: Plumbing, Electrical, Structural, Solar disciplines.
"""
from database import SessionLocal
from models import Material

SEED_MATERIALS = [
    # ────────────────────────────────────────────────────────────────────────
    # PLUMBING — Supply Pipes
    # ────────────────────────────────────────────────────────────────────────
    {"name": "PPR Pipe", "category": "Supply Pipe", "size": "20mm",  "unit": "length", "price": 120},
    {"name": "PPR Pipe", "category": "Supply Pipe", "size": "25mm",  "unit": "length", "price": 150},
    {"name": "PPR Pipe", "category": "Supply Pipe", "size": "32mm",  "unit": "length", "price": 220},
    {"name": "PPR Pipe", "category": "Supply Pipe", "size": "40mm",  "unit": "length", "price": 320},
    {"name": "PPR Pipe", "category": "Supply Pipe", "size": "50mm",  "unit": "length", "price": 450},
    {"name": "PPR Pipe", "category": "Supply Pipe", "size": "63mm",  "unit": "length", "price": 680},
    {"name": "PPR Pipe", "category": "Supply Pipe", "size": "75mm",  "unit": "length", "price": 950},
    # Drainage PVC
    {"name": "PVC Pipe", "category": "Drainage Pipe", "size": "50mm",  "unit": "length", "price": 220},
    {"name": "PVC Pipe", "category": "Drainage Pipe", "size": "75mm",  "unit": "length", "price": 320},
    {"name": "PVC Pipe", "category": "Drainage Pipe", "size": "100mm", "unit": "length", "price": 450},
    {"name": "PVC Pipe", "category": "Drainage Pipe", "size": "150mm", "unit": "length", "price": 800},
    {"name": "PVC Pipe", "category": "Drainage Pipe", "size": "200mm", "unit": "length", "price": 1200},
    # GI Pipes
    {"name": "GI Pipe (S40)", "category": "Supply Pipe", "size": "20mm", "unit": "length", "price": 280},
    {"name": "GI Pipe (S40)", "category": "Supply Pipe", "size": "25mm", "unit": "length", "price": 380},
    {"name": "GI Pipe (S40)", "category": "Supply Pipe", "size": "32mm", "unit": "length", "price": 520},
    {"name": "GI Pipe (S40)", "category": "Supply Pipe", "size": "40mm", "unit": "length", "price": 680},
    {"name": "GI Pipe (S40)", "category": "Supply Pipe", "size": "50mm", "unit": "length", "price": 950},
    # PPR Fittings
    {"name": "PPR Elbow 90°",  "category": "Fitting", "size": "20mm",    "unit": "pcs", "price": 45},
    {"name": "PPR Elbow 90°",  "category": "Fitting", "size": "25mm",    "unit": "pcs", "price": 65},
    {"name": "PPR Elbow 90°",  "category": "Fitting", "size": "32mm",    "unit": "pcs", "price": 95},
    {"name": "PPR Elbow 45°",  "category": "Fitting", "size": "20mm",    "unit": "pcs", "price": 45},
    {"name": "PPR Elbow 45°",  "category": "Fitting", "size": "25mm",    "unit": "pcs", "price": 65},
    {"name": "PPR Tee",        "category": "Fitting", "size": "20mm",    "unit": "pcs", "price": 55},
    {"name": "PPR Tee",        "category": "Fitting", "size": "25mm",    "unit": "pcs", "price": 75},
    {"name": "PPR Tee",        "category": "Fitting", "size": "32mm",    "unit": "pcs", "price": 115},
    {"name": "PPR Reducer",    "category": "Fitting", "size": "25x20mm", "unit": "pcs", "price": 50},
    {"name": "PPR Reducer",    "category": "Fitting", "size": "32x25mm", "unit": "pcs", "price": 70},
    {"name": "PPR Union",      "category": "Fitting", "size": "25mm",    "unit": "pcs", "price": 120},
    {"name": "PPR End Cap",    "category": "Fitting", "size": "25mm",    "unit": "pcs", "price": 35},
    # PVC Fittings
    {"name": "PVC Elbow 90°",    "category": "Fitting", "size": "50mm",  "unit": "pcs", "price": 35},
    {"name": "PVC Elbow 90°",    "category": "Fitting", "size": "75mm",  "unit": "pcs", "price": 55},
    {"name": "PVC Elbow 90°",    "category": "Fitting", "size": "100mm", "unit": "pcs", "price": 85},
    {"name": "PVC Tee",          "category": "Fitting", "size": "50mm",  "unit": "pcs", "price": 45},
    {"name": "PVC Tee",          "category": "Fitting", "size": "75mm",  "unit": "pcs", "price": 65},
    {"name": "PVC Tee",          "category": "Fitting", "size": "100mm", "unit": "pcs", "price": 95},
    {"name": "PVC Sanitary Tee", "category": "Fitting", "size": "100mm", "unit": "pcs", "price": 110},
    {"name": "PVC Wye",          "category": "Fitting", "size": "100mm", "unit": "pcs", "price": 130},
    {"name": "Floor Drain (PVC)","category": "Fitting", "size": "100mm", "unit": "pcs", "price": 180},
    {"name": "P-Trap",           "category": "Fitting", "size": "50mm",  "unit": "pcs", "price": 95},
    # Valves
    {"name": "Gate Valve",              "category": "Valve", "size": "15mm", "unit": "pcs", "price": 350},
    {"name": "Gate Valve",              "category": "Valve", "size": "20mm", "unit": "pcs", "price": 480},
    {"name": "Gate Valve",              "category": "Valve", "size": "25mm", "unit": "pcs", "price": 650},
    {"name": "Gate Valve",              "category": "Valve", "size": "32mm", "unit": "pcs", "price": 850},
    {"name": "Gate Valve",              "category": "Valve", "size": "40mm", "unit": "pcs", "price": 1100},
    {"name": "Gate Valve",              "category": "Valve", "size": "50mm", "unit": "pcs", "price": 1500},
    {"name": "Ball Valve",              "category": "Valve", "size": "15mm", "unit": "pcs", "price": 280},
    {"name": "Ball Valve",              "category": "Valve", "size": "20mm", "unit": "pcs", "price": 380},
    {"name": "Ball Valve",              "category": "Valve", "size": "25mm", "unit": "pcs", "price": 520},
    {"name": "Check Valve (Swing)",     "category": "Valve", "size": "20mm", "unit": "pcs", "price": 450},
    {"name": "Check Valve (Swing)",     "category": "Valve", "size": "25mm", "unit": "pcs", "price": 620},
    {"name": "Pressure Reducing Valve", "category": "Valve", "size": "25mm", "unit": "pcs", "price": 2800},
    {"name": "Float Valve",             "category": "Valve", "size": "25mm", "unit": "pcs", "price": 380},
    # Plumbing Fixtures
    {"name": "Water Closet (Tank)",        "category": "Fixture", "size": "Standard", "unit": "set",  "price": 3500},
    {"name": "Water Closet (Flush Valve)", "category": "Fixture", "size": "Standard", "unit": "set",  "price": 5500},
    {"name": "Lavatory (Wall-hung)",       "category": "Fixture", "size": "Standard", "unit": "set",  "price": 2800},
    {"name": "Lavatory (Countertop)",      "category": "Fixture", "size": "Standard", "unit": "set",  "price": 3500},
    {"name": "Kitchen Sink (SS)",          "category": "Fixture", "size": "Standard", "unit": "set",  "price": 3200},
    {"name": "Shower Set",                 "category": "Fixture", "size": "Standard", "unit": "set",  "price": 2500},
    {"name": "Bathtub",                    "category": "Fixture", "size": "Standard", "unit": "unit", "price": 12000},
    {"name": "Urinal (Wall-hung)",         "category": "Fixture", "size": "Standard", "unit": "set",  "price": 4500},
    {"name": "Service Sink",               "category": "Fixture", "size": "Standard", "unit": "set",  "price": 4800},
    {"name": "Faucet (Lavatory)",          "category": "Fixture", "size": "Standard", "unit": "pcs",  "price": 850},
    {"name": "Faucet (Kitchen)",           "category": "Fixture", "size": "Standard", "unit": "pcs",  "price": 1200},
    # Plumbing Equipment
    {"name": "Submersible Pump", "category": "Equipment", "size": "0.5HP", "unit": "unit", "price": 8500},
    {"name": "Submersible Pump", "category": "Equipment", "size": "1HP",   "unit": "unit", "price": 12000},
    {"name": "Submersible Pump", "category": "Equipment", "size": "2HP",   "unit": "unit", "price": 22000},
    {"name": "Booster Pump",     "category": "Equipment", "size": "0.5HP", "unit": "unit", "price": 10500},
    {"name": "Booster Pump",     "category": "Equipment", "size": "1HP",   "unit": "unit", "price": 15000},
    {"name": "Booster Pump",     "category": "Equipment", "size": "2HP",   "unit": "unit", "price": 28000},
    {"name": "Water Tank (Polyethylene)", "category": "Equipment", "size": "500L",  "unit": "unit", "price": 5500},
    {"name": "Water Tank (Polyethylene)", "category": "Equipment", "size": "1000L", "unit": "unit", "price": 9500},
    {"name": "Water Tank (Polyethylene)", "category": "Equipment", "size": "2000L", "unit": "unit", "price": 18000},
    {"name": "Water Tank (Polyethylene)", "category": "Equipment", "size": "5000L", "unit": "unit", "price": 42000},
    {"name": "Pressure Tank",   "category": "Equipment", "size": "20L",  "unit": "unit", "price": 4500},
    {"name": "Pressure Tank",   "category": "Equipment", "size": "50L",  "unit": "unit", "price": 8500},
    {"name": "Water Meter",     "category": "Equipment", "size": "20mm", "unit": "unit", "price": 2800},
    {"name": "Water Meter",     "category": "Equipment", "size": "25mm", "unit": "unit", "price": 3500},
    # Plumbing Labor
    {"name": "Plumbing Labor (Rough-in)",  "category": "Labor", "size": "N/A", "unit": "day", "price": 1200},
    {"name": "Plumbing Labor (Finishing)", "category": "Labor", "size": "N/A", "unit": "day", "price": 1500},
    {"name": "Master Plumber",             "category": "Labor", "size": "N/A", "unit": "day", "price": 2500},
    {"name": "Plumbing Helper",            "category": "Labor", "size": "N/A", "unit": "day", "price": 800},

    # ────────────────────────────────────────────────────────────────────────
    # ELECTRICAL — Wires & Cables
    # ────────────────────────────────────────────────────────────────────────
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "1.5mm²", "unit": "meter", "price": 22},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "2.0mm²", "unit": "meter", "price": 28},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "3.5mm²", "unit": "meter", "price": 45},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "5.5mm²", "unit": "meter", "price": 70},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "8.0mm²", "unit": "meter", "price": 110},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "14mm²",  "unit": "meter", "price": 195},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "22mm²",  "unit": "meter", "price": 305},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "30mm²",  "unit": "meter", "price": 415},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "38mm²",  "unit": "meter", "price": 530},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "50mm²",  "unit": "meter", "price": 700},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "60mm²",  "unit": "meter", "price": 860},
    {"name": "THHN Copper Wire", "category": "Electrical Wire", "size": "100mm²", "unit": "meter", "price": 1450},
    # Circuit Breakers
    {"name": "MCB",  "category": "Circuit Breaker", "size": "15A",  "unit": "pcs", "price": 280},
    {"name": "MCB",  "category": "Circuit Breaker", "size": "20A",  "unit": "pcs", "price": 310},
    {"name": "MCB",  "category": "Circuit Breaker", "size": "30A",  "unit": "pcs", "price": 350},
    {"name": "MCCB", "category": "Circuit Breaker", "size": "60A",  "unit": "pcs", "price": 1800},
    {"name": "MCCB", "category": "Circuit Breaker", "size": "100A", "unit": "pcs", "price": 3500},
    {"name": "MCCB", "category": "Circuit Breaker", "size": "150A", "unit": "pcs", "price": 5500},
    {"name": "MCCB", "category": "Circuit Breaker", "size": "200A", "unit": "pcs", "price": 8000},
    {"name": "MCCB (Main)", "category": "Circuit Breaker", "size": "300A", "unit": "pcs", "price": 18000},
    {"name": "MCCB (Main)", "category": "Circuit Breaker", "size": "400A", "unit": "pcs", "price": 28000},
    # Panel Boards & Load Centers
    {"name": "Load Center", "category": "Panel Board", "size": "12-circuit",  "unit": "unit", "price": 3500},
    {"name": "Load Center", "category": "Panel Board", "size": "18-circuit",  "unit": "unit", "price": 5500},
    {"name": "Load Center", "category": "Panel Board", "size": "24-circuit",  "unit": "unit", "price": 7500},
    {"name": "Distribution Panel", "category": "Panel Board", "size": "30-circuit", "unit": "unit", "price": 12000},
    {"name": "Distribution Panel", "category": "Panel Board", "size": "42-circuit", "unit": "unit", "price": 18000},
    # Conduits
    {"name": "EMT Pipe", "category": "Conduit", "size": '1/2"', "unit": "length", "price": 85},
    {"name": "EMT Pipe", "category": "Conduit", "size": '3/4"', "unit": "length", "price": 120},
    {"name": "EMT Pipe", "category": "Conduit", "size": '1"',   "unit": "length", "price": 180},
    {"name": "EMT Pipe", "category": "Conduit", "size": '1-1/4"', "unit": "length", "price": 250},
    {"name": "EMT Pipe", "category": "Conduit", "size": '1-1/2"', "unit": "length", "price": 320},
    {"name": "EMT Pipe", "category": "Conduit", "size": '2"',     "unit": "length", "price": 420},
    {"name": "PVC Conduit (Orange)", "category": "Conduit", "size": '1/2"', "unit": "length", "price": 55},
    {"name": "PVC Conduit (Orange)", "category": "Conduit", "size": '3/4"', "unit": "length", "price": 75},
    {"name": "PVC Conduit (Orange)", "category": "Conduit", "size": '1"',   "unit": "length", "price": 110},
    # Conduit Fittings
    {"name": "EMT Connector",  "category": "Conduit Fitting", "size": '3/4"', "unit": "pcs", "price": 35},
    {"name": "EMT Coupler",    "category": "Conduit Fitting", "size": '3/4"', "unit": "pcs", "price": 30},
    {"name": "EMT Elbow",      "category": "Conduit Fitting", "size": '3/4"', "unit": "pcs", "price": 55},
    # Boxes
    {"name": "Junction Box (2×4)", "category": "Outlet Box", "size": "Standard", "unit": "pcs", "price": 35},
    {"name": "Junction Box (4×4)", "category": "Outlet Box", "size": "Standard", "unit": "pcs", "price": 55},
    {"name": "Pull Box",           "category": "Outlet Box", "size": '4"×4"×2"', "unit": "pcs", "price": 75},
    # Wiring Devices
    {"name": "Convenience Outlet",    "category": "Outlet/Switch", "size": "15A/250V", "unit": "pcs", "price": 180},
    {"name": "GFCI Outlet",           "category": "Outlet/Switch", "size": "15A/250V", "unit": "pcs", "price": 650},
    {"name": "Single Pole Switch",    "category": "Outlet/Switch", "size": "15A/250V", "unit": "pcs", "price": 120},
    {"name": "3-Way Switch",          "category": "Outlet/Switch", "size": "15A/250V", "unit": "pcs", "price": 180},
    {"name": "Weatherproof Outlet",   "category": "Outlet/Switch", "size": "15A/250V", "unit": "pcs", "price": 350},
    # Grounding
    {"name": "Ground Rod (Copper-Clad)", "category": "Grounding", "size": '5/8"×8ft', "unit": "pcs",   "price": 650},
    {"name": "Ground Rod Clamp",         "category": "Grounding", "size": '5/8"',     "unit": "pcs",   "price": 120},
    {"name": "Ground Bar",               "category": "Grounding", "size": "12-hole",  "unit": "pcs",   "price": 480},
    # Electrical Labor
    {"name": "Wire Installation",          "category": "Labor", "size": "N/A", "unit": "meter", "price": 15},
    {"name": "Lighting Installation",      "category": "Labor", "size": "N/A", "unit": "unit",  "price": 120},
    {"name": "Outlet/Switch Installation", "category": "Labor", "size": "N/A", "unit": "unit",  "price": 150},
    {"name": "Panel Installation",         "category": "Labor", "size": "N/A", "unit": "unit",  "price": 1500},
    {"name": "Electrical Works (General)", "category": "Labor", "size": "N/A", "unit": "day",   "price": 1200},
    {"name": "Licensed Electrician",       "category": "Labor", "size": "N/A", "unit": "day",   "price": 2500},
    # Testing & Commissioning
    {"name": "Insulation Resistance Test", "category": "Testing", "size": "N/A", "unit": "test", "price": 3000},
    {"name": "Ground Resistance Test",     "category": "Testing", "size": "N/A", "unit": "test", "price": 2500},
    {"name": "Load Testing",               "category": "Testing", "size": "N/A", "unit": "test", "price": 5000},
    {"name": "System Commissioning",       "category": "Testing", "size": "N/A", "unit": "lot",  "price": 8000},

    # ────────────────────────────────────────────────────────────────────────
    # STRUCTURAL — Concrete Works
    # ────────────────────────────────────────────────────────────────────────
    {"name": "Portland Cement", "category": "Concrete Works", "size": "40 kg/bag", "unit": "bag",  "price": 280},
    {"name": "Washed Sand (Fine Aggregate)",            "category": "Concrete Works", "size": "—", "unit": "m³",  "price": 1800},
    {"name": "Crushed Stone Gravel (Coarse Aggregate)", "category": "Concrete Works", "size": "—", "unit": "m³",  "price": 2200},
    {"name": "Ready-Mix Concrete", "category": "Concrete Works", "size": "C20 (3000 psi)", "unit": "m³", "price": 5500},
    {"name": "Ready-Mix Concrete", "category": "Concrete Works", "size": "C25 (3500 psi)", "unit": "m³", "price": 6200},
    {"name": "Ready-Mix Concrete", "category": "Concrete Works", "size": "C30 (4000 psi)", "unit": "m³", "price": 7000},
    {"name": "Water Reducer (Plasticizer)", "category": "Admixtures", "size": "—", "unit": "liter", "price": 220},
    # Reinforcement Steel
    {"name": "Deformed Steel Bar (RSB)", "category": "Reinforcement Steel", "size": "10mm × 6m", "unit": "pcs", "price": 145},
    {"name": "Deformed Steel Bar (RSB)", "category": "Reinforcement Steel", "size": "12mm × 6m", "unit": "pcs", "price": 210},
    {"name": "Deformed Steel Bar (RSB)", "category": "Reinforcement Steel", "size": "16mm × 6m", "unit": "pcs", "price": 375},
    {"name": "Deformed Steel Bar (RSB)", "category": "Reinforcement Steel", "size": "20mm × 6m", "unit": "pcs", "price": 585},
    {"name": "Deformed Steel Bar (RSB)", "category": "Reinforcement Steel", "size": "25mm × 6m", "unit": "pcs", "price": 915},
    {"name": "Deformed Steel Bar (RSB)", "category": "Reinforcement Steel", "size": "32mm × 6m", "unit": "pcs", "price": 1490},
    {"name": "G.I. Tie Wire", "category": "Reinforcement Steel", "size": "#16 gauge", "unit": "kg", "price": 85},
    # Structural Steel
    {"name": "Wide Flange (WF) Beam",    "category": "Structural Steel", "size": "W150×24",  "unit": "kg",  "price": 75},
    {"name": "Wide Flange (WF) Beam",    "category": "Structural Steel", "size": "W200×36",  "unit": "kg",  "price": 75},
    {"name": "Wide Flange (WF) Beam",    "category": "Structural Steel", "size": "W250×49",  "unit": "kg",  "price": 75},
    {"name": "C-Purlins",               "category": "Structural Steel", "size": "75×50×15", "unit": "meter", "price": 125},
    {"name": "C-Purlins",               "category": "Structural Steel", "size": "100×50×15","unit": "meter", "price": 155},
    {"name": "Angular Bar",              "category": "Structural Steel", "size": "50×50×5mm","unit": "meter", "price": 85},
    {"name": "Flat Bar",                 "category": "Structural Steel", "size": "50×6mm",   "unit": "meter", "price": 65},
    # Formwork
    {"name": "Phenolic Board (12mm)", "category": "Formwork", "size": "4ft × 8ft",  "unit": "sheet", "price": 1100},
    {"name": "Coco Lumber",           "category": "Formwork", "size": '2"×3"×8ft',  "unit": "pcs",   "price": 65},
    {"name": "Common Wire Nails",     "category": "Formwork", "size": '3" CWN',     "unit": "kg",    "price": 75},
    {"name": "Form Oil (Release Agent)", "category": "Formwork", "size": "—",        "unit": "liter", "price": 180},
    {"name": "Acrow Props",           "category": "Formwork", "size": "Adjustable", "unit": "pcs",   "price": 350},
    # Structural Labor
    {"name": "Structural Works (Concrete Pouring & Finishing)", "category": "Labor", "size": "N/A", "unit": "day", "price": 1200},
    {"name": "Carpentry (Formwork)",  "category": "Labor", "size": "N/A", "unit": "day", "price": 1100},
    {"name": "Steel Bar Works (Rebar)", "category": "Labor", "size": "N/A", "unit": "day", "price": 1200},
    {"name": "Mason (Concrete Works)", "category": "Labor", "size": "N/A", "unit": "day", "price": 900},
    {"name": "Construction Laborer",   "category": "Labor", "size": "N/A", "unit": "day", "price": 600},

    # ────────────────────────────────────────────────────────────────────────
    # SOLAR — PV System Components
    # ────────────────────────────────────────────────────────────────────────
    # PV Modules
    {"name": "Monocrystalline Solar Panel", "category": "PV Module", "size": "400Wp", "unit": "unit", "price": 12000},
    {"name": "Monocrystalline Solar Panel", "category": "PV Module", "size": "450Wp", "unit": "unit", "price": 13500},
    {"name": "Monocrystalline Solar Panel", "category": "PV Module", "size": "500Wp", "unit": "unit", "price": 15000},
    {"name": "Monocrystalline Solar Panel", "category": "PV Module", "size": "540Wp", "unit": "unit", "price": 16200},
    {"name": "Polycrystalline Solar Panel", "category": "PV Module", "size": "330Wp", "unit": "unit", "price": 8500},
    # Inverters
    {"name": "String Inverter / Hybrid Inverter", "category": "Inverter", "size": "1.0kW",  "unit": "unit", "price": 15000},
    {"name": "String Inverter / Hybrid Inverter", "category": "Inverter", "size": "3.0kW",  "unit": "unit", "price": 35000},
    {"name": "String Inverter / Hybrid Inverter", "category": "Inverter", "size": "5.0kW",  "unit": "unit", "price": 55000},
    {"name": "String Inverter / Hybrid Inverter", "category": "Inverter", "size": "10.0kW", "unit": "unit", "price": 95000},
    {"name": "String Inverter / Hybrid Inverter", "category": "Inverter", "size": "20.0kW", "unit": "unit", "price": 185000},
    {"name": "Central Inverter",                  "category": "Inverter", "size": "50.0kW", "unit": "unit", "price": 380000},
    # Battery
    {"name": "Lithium Battery Bank", "category": "Battery", "size": "5.0kWh",  "unit": "unit", "price": 60000},
    {"name": "Lithium Battery Bank", "category": "Battery", "size": "10.0kWh", "unit": "unit", "price": 120000},
    {"name": "Lithium Battery Bank", "category": "Battery", "size": "20.0kWh", "unit": "unit", "price": 230000},
    {"name": "Battery Management System (BMS)", "category": "Battery", "size": "—", "unit": "unit", "price": 12000},
    {"name": "Battery Cable (Copper)", "category": "Battery", "size": "35mm²", "unit": "meter", "price": 180},
    # Solar Mounting
    {"name": "Aluminum Rail (Mounting Rail)", "category": "Mounting", "size": "40mm×40mm×4.2m", "unit": "pcs", "price": 850},
    {"name": "Stainless Mid Clamp",           "category": "Mounting", "size": "35mm", "unit": "pcs", "price": 75},
    {"name": "Stainless End Clamp",           "category": "Mounting", "size": "35mm", "unit": "pcs", "price": 65},
    {"name": "Roof Hook / L-Bracket",         "category": "Mounting", "size": "Galv.", "unit": "pcs", "price": 120},
    {"name": "M8 Stainless Bolt Set",         "category": "Mounting", "size": "M8×20", "unit": "set", "price": 45},
    # DC Wiring
    {"name": "PV Wire / Solar Cable",     "category": "DC Wiring", "size": "4mm² (12AWG)", "unit": "meter", "price": 85},
    {"name": "MC4 Connector Pair",        "category": "DC Wiring", "size": "30A",           "unit": "pair",  "price": 120},
    {"name": "MC4 Branch Connector (Y)",  "category": "DC Wiring", "size": "2-in-1",        "unit": "pcs",   "price": 180},
    {"name": "DC Circuit Breaker",        "category": "DC Wiring", "size": "15A",           "unit": "pcs",   "price": 450},
    {"name": "DC Surge Protection Device (SPD)", "category": "DC Wiring", "size": "600V DC", "unit": "unit", "price": 2500},
    {"name": "PV Combiner Box",           "category": "DC Wiring", "size": "4-string",      "unit": "unit",  "price": 5500},
    # AC Wiring
    {"name": "AC Circuit Breaker (2-pole)", "category": "AC Wiring", "size": "30A",   "unit": "pcs",  "price": 850},
    {"name": "AC Surge Protection Device",  "category": "AC Wiring", "size": "275V AC","unit": "unit", "price": 2200},
    # Monitoring
    {"name": "Solar Monitoring System (WiFi Logger)", "category": "Monitoring", "size": "—", "unit": "unit", "price": 8500},
    # Solar Labor
    {"name": "Solar Installation Labor", "category": "Labor", "size": "—", "unit": "day", "price": 1800},

    # ────────────────────────────────────────────────────────────────────────
    # MOBILIZATION
    # ────────────────────────────────────────────────────────────────────────
    {"name": "Vehicle Rental (L300/Truck)", "category": "Mobilization", "size": "Per Day", "unit": "day",  "price": 4500},
    {"name": "Worker Transport",            "category": "Mobilization", "size": "Per Trip","unit": "trip", "price": 500},
    {"name": "Equipment Trucking",          "category": "Mobilization", "size": "Per Day", "unit": "day",  "price": 8500},

    # ────────────────────────────────────────────────────────────────────────
    # MISCELLANEOUS
    # ────────────────────────────────────────────────────────────────────────
    {"name": "Temporary Power Connection", "category": "Miscellaneous", "size": "—", "unit": "lot", "price": 15000},
    {"name": "Scaffolding (Bamboo)",       "category": "Miscellaneous", "size": "—", "unit": "lot", "price": 25000},
    {"name": "Scaffolding (Metal Frame)",  "category": "Miscellaneous", "size": "—", "unit": "lot", "price": 45000},
    {"name": "Site Safety Equipment",      "category": "Miscellaneous", "size": "—", "unit": "lot", "price": 8000},
    {"name": "Miscellaneous Fittings",     "category": "Miscellaneous", "size": "—", "unit": "lot", "price": 5000},
]


def seed_database():
    db = SessionLocal()
    try:
        from models import Material
        if db.query(Material).count() > 0:
            return
        for data in SEED_MATERIALS:
            row = {k: v for k, v in data.items()}
            row.setdefault("supplier", "Standard")
            db.add(Material(**row))
        db.commit()
        print(f"[seed] Inserted {len(SEED_MATERIALS)} materials.")
    except Exception as e:
        db.rollback()
        print(f"[seed] Error: {e}")
    finally:
        db.close()
