from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# ── Authentication ────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id                  = Column(Integer, primary_key=True, index=True)
    email               = Column(String, unique=True, nullable=False, index=True)
    password_hash       = Column(String, nullable=False)
    full_name           = Column(String, nullable=True)
    company_name        = Column(String, nullable=True)

    # Role: owner | engineer | viewer
    role                = Column(String, default="owner", nullable=False)

    # Subscription: starter | professional | enterprise
    subscription_plan   = Column(String, default="starter", nullable=False)

    # Status: trial | active | expired
    subscription_status = Column(String, default="trial", nullable=False)

    trial_start         = Column(DateTime, nullable=True)
    trial_end           = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, server_default=func.now())

    projects            = relationship("Project", back_populates="owner")


# ── Materials ─────────────────────────────────────────────────────────────────

class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    size = Column(String)
    unit = Column(String)
    price = Column(Float, nullable=False)
    supplier = Column(String, default="Standard")
    last_updated = Column(DateTime, server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String, nullable=False)
    location = Column(String)
    building_type = Column(String, default="Residential")
    floors = Column(Integer, default=1)
    building_area = Column(Float, default=0.0)          # m²
    # Plumbing
    water_source = Column(String, default="Municipal")
    tank_capacity = Column(Float, default=1000.0)
    # Mobilization
    distance_from_manila = Column(Float, default=0.0)   # km
    transport_cost_per_km = Column(Float, default=50.0) # ₱/km
    num_workers = Column(Integer, default=5)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Owner (nullable for migration safety — existing rows get NULL)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner               = relationship("User", back_populates="projects")

    estimates = relationship("Estimate", back_populates="project", cascade="all, delete-orphan")
    fixtures = relationship("ProjectFixture", back_populates="project", cascade="all, delete-orphan")
    pipe_calculations = relationship("PipeCalculation", back_populates="project", cascade="all, delete-orphan")
    electrical_calculations = relationship("ElectricalCalculation", back_populates="project", cascade="all, delete-orphan")
    structural_calculations = relationship("StructuralCalculation", back_populates="project", cascade="all, delete-orphan")
    solar_calculations = relationship("SolarCalculation", back_populates="project", cascade="all, delete-orphan")


class ProjectFixture(Base):
    __tablename__ = "project_fixtures"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    fixture_type = Column(String, nullable=False)
    fixture_name = Column(String, nullable=False)
    quantity = Column(Integer, default=0)
    wsfu_private = Column(Float)
    wsfu_public = Column(Float)
    floor_location = Column(String)

    project = relationship("Project", back_populates="fixtures")


class Estimate(Base):
    __tablename__ = "estimates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    item_name = Column(String, nullable=False)
    category = Column(String)
    discipline = Column(String, default="Plumbing")  # Electrical, Structural, Solar, Plumbing, Labor, Misc
    size = Column(String)
    unit = Column(String)
    quantity = Column(Float)
    material_price = Column(Float, default=0)   # raw DB price
    unit_price = Column(Float, default=0)        # after profit + VAT
    total_cost = Column(Float, default=0)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="estimates")
    material = relationship("Material")


class PipeCalculation(Base):
    __tablename__ = "pipe_calculations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    section_name = Column(String)
    flow_rate_lps = Column(Float)
    velocity_mps = Column(Float)
    pipe_diameter_mm = Column(Integer)
    pressure_loss_m = Column(Float)
    pipe_material = Column(String)
    length_m = Column(Float)
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="pipe_calculations")


class ElectricalCalculation(Base):
    __tablename__ = "electrical_calculations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    # Stored as JSON blobs for flexibility
    circuits = Column(JSON)              # list of circuit dicts
    results = Column(JSON)               # full analysis results
    supply_phase = Column(String, default="single")
    power_factor = Column(Float, default=0.85)
    supply_voltage = Column(Float, default=220.0)
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="electrical_calculations")


class StructuralCalculation(Base):
    __tablename__ = "structural_calculations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    elements = Column(JSON)              # list of structural element dicts
    results = Column(JSON)               # full takeoff results
    concrete_class = Column(String, default="C25")
    rebar_grade = Column(String, default="Grade 60")
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="structural_calculations")


class SolarCalculation(Base):
    __tablename__ = "solar_calculations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    inputs = Column(JSON)                # design inputs
    results = Column(JSON)               # sizing results
    system_type = Column(String, default="grid_tied")   # grid_tied, off_grid, hybrid
    created_at = Column(DateTime, server_default=func.now())

    project = relationship("Project", back_populates="solar_calculations")
