import datetime
from sqlalchemy import Column, String, Float, Integer, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base

class HistoricalFloodEvent(Base):
    __tablename__ = "historical_events"

    id = Column(String, primary_key=True, index=True)
    city_id = Column(String, ForeignKey("cities.id"), nullable=False, index=True)
    
    date = Column(DateTime, nullable=False)
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False) # RiskLevel
    
    max_rainfall_mm_hr = Column(Float, nullable=False)
    total_rainfall_mm = Column(Float, nullable=False)
    duration_hours = Column(Float, nullable=False)
    affected_area_sq_km = Column(Float, nullable=False)
    
    affected_zones = Column(JSON, default=[])
    description = Column(String, nullable=False)
    
    rainfall_progression = Column(JSON, default=[])
    
    # Optional geometry for predicted vs observed extent could be stored in a separate table, 
    # but we'll use JSON for feature collections for simplicity in prototype
    predicted_extent = Column(JSON, nullable=True)
    observed_extent = Column(JSON, nullable=True)
    
    metadata_obj = Column(JSON, default={})
    
    city = relationship("City", back_populates="historical_events")
