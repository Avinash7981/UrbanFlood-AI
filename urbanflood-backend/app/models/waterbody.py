from sqlalchemy import Column, String, Float, JSON
from geoalchemy2 import Geometry
import uuid

from app.core.database import Base

class WaterBody(Base):
    __tablename__ = 'water_bodies'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    city_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=True)
    type = Column(String, nullable=True)
    area = Column(Float, nullable=True)
    metadata_json = Column(JSON, default={})
    geom = Column(Geometry('MULTIPOLYGON', srid=4326), nullable=False)
