from sqlalchemy import Column, String, Float, JSON, Enum
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.core.database import Base

class City(Base):
    __tablename__ = "cities"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    state = Column(String, nullable=False)
    country = Column(String, nullable=False)
    
    # Store center as [lng, lat]
    center_lng = Column(Float, nullable=False)
    center_lat = Column(Float, nullable=False)
    zoom = Column(Float, nullable=False, default=11.0)
    
    # Boundary can be a polygon if we want exact limits
    boundary = Column(Geometry('POLYGON', srid=4326), nullable=True)
    
    # Using JSON for simplicity here, could be normalized into related tables
    data_sources = Column(JSON, default=[])
    enabled_layers = Column(JSON, default=[])
    
    status = Column(String, nullable=False, default="not_configured") # 'active_pilot', 'configured', 'not_configured'
    
    population = Column(Float, nullable=True)
    area = Column(Float, nullable=True)
    timezone = Column(String, nullable=False, default="Asia/Kolkata")
    
    # Relationships
    flood_zones = relationship("FloodZone", back_populates="city", cascade="all, delete-orphan")
    historical_events = relationship("HistoricalFloodEvent", back_populates="city", cascade="all, delete-orphan")
    alerts = relationship("FloodAlert", back_populates="city", cascade="all, delete-orphan")
