import datetime
from sqlalchemy import Column, String, Integer, JSON, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.core.database import Base

class FloodAlert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    city_id = Column(String, ForeignKey("cities.id"), nullable=False, index=True)
    
    severity = Column(String, nullable=False) # 'info', 'warning', 'high', 'critical'
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    
    zone_id = Column(String, nullable=True)
    zone_name = Column(String, nullable=True)
    
    # Optional location point
    location = Column(Geometry('POINT', srid=4326), nullable=True)
    
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    estimated_onset_minutes = Column(Integer, nullable=True)
    
    factors = Column(JSON, default=[])
    status = Column(String, nullable=False, default='active') # 'active', 'acknowledged', 'resolved', 'expired'
    
    acknowledged_by = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    
    is_demo = Column(Boolean, default=False)
    
    city = relationship("City", back_populates="alerts")
