import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.core.database import Base

class FloodZone(Base):
    __tablename__ = "flood_zones"

    id = Column(String, primary_key=True, index=True)
    city_id = Column(String, ForeignKey("cities.id"), nullable=False, index=True)
    
    name = Column(String, nullable=False)
    risk_level = Column(String, nullable=False) # 'low', 'watch', 'high', 'critical'
    probability = Column(Float, nullable=False) # 0-100
    severity = Column(String, nullable=False) # 'low', 'moderate', 'high', 'severe'
    
    estimated_onset_minutes = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=False) # 0-100
    
    factors = Column(JSON, default=[]) # list of factor dicts
    is_demo = Column(Boolean, default=False)
    
    last_assessed = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Polygon representing the exact zone
    geom = Column(Geometry('POLYGON', srid=4326), nullable=False)
    
    city = relationship("City", back_populates="flood_zones")
