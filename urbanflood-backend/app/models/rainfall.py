import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime
from geoalchemy2 import Geometry

from app.core.database import Base

class RainfallObservation(Base):
    """Real-time or historical rainfall observations"""
    __tablename__ = "rainfall_observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    city_id = Column(String, ForeignKey("cities.id"), nullable=False, index=True)
    
    timestamp = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    intensity_mm_hr = Column(Float, nullable=False)
    accumulation_mm = Column(Float, nullable=False)
    source = Column(String, nullable=False) # 'gauge', 'satellite', 'radar'
    
    # Optional point geometry if it's a specific gauge
    location = Column(Geometry('POINT', srid=4326), nullable=True)
