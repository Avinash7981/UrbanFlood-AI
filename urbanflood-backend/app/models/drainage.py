from sqlalchemy import Column, String, Boolean, JSON, Float, Integer
from geoalchemy2 import Geometry
from app.core.database import Base

class DrainSegment(Base):
    __tablename__ = "drain_segments"

    id = Column(String, primary_key=True, index=True)
    city_id = Column(String, nullable=False, index=True)
    
    source_id = Column(String, nullable=True) # e.g. FID from shapefile
    source_type = Column(String, default="drain")
    category = Column(String, nullable=True)
    layer = Column(String, nullable=True)
    dr_code = Column(String, nullable=True)
    pi_code = Column(String, nullable=True)
    
    length_m = Column(Float, nullable=True)
    
    # Topology pointers for the graph
    upstream_node_id = Column(String, nullable=True)
    downstream_node_id = Column(String, nullable=True)
    flow_direction = Column(String, nullable=True) # e.g. 'POSITIVE', 'UNKNOWN'
    
    metadata_json = Column(JSON, default={})
    is_demo = Column(Boolean, default=False)
    
    geom = Column(Geometry('MULTILINESTRING', srid=4326), nullable=False)


class NalaSegment(Base):
    __tablename__ = "nala_segments"

    id = Column(String, primary_key=True, index=True)
    city_id = Column(String, nullable=False, index=True)
    
    nala_id = Column(String, nullable=True)
    nala_name = Column(String, nullable=True)
    district = Column(String, nullable=True)
    mandal = Column(String, nullable=True)
    village = Column(String, nullable=True)
    zone_id = Column(String, nullable=True)
    zone_name = Column(String, nullable=True)
    
    length_m = Column(Float, nullable=True)
    
    # Topology pointers for the graph
    upstream_node_id = Column(String, nullable=True)
    downstream_node_id = Column(String, nullable=True)
    flow_direction = Column(String, nullable=True) # e.g. 'POSITIVE', 'UNKNOWN'
    
    metadata_json = Column(JSON, default={})
    is_demo = Column(Boolean, default=False)
    
    geom = Column(Geometry('MULTILINESTRING', srid=4326), nullable=False)


class DrainNode(Base):
    __tablename__ = "drain_nodes"

    id = Column(String, primary_key=True, index=True)
    city_id = Column(String, nullable=False, index=True)
    
    node_type = Column(String, nullable=False, default="junction")
    
    connected_segment_count = Column(Integer, default=0)
    upstream_segment_count = Column(Integer, default=0)
    downstream_segment_count = Column(Integer, default=0)
    
    collection_area = Column(Float, nullable=True) # Labelled "Estimated contributing/influence area" in UI
    influence_score = Column(Float, nullable=True)
    criticality_score = Column(Float, nullable=True)
    
    stress_level = Column(String, nullable=False, default="low") # 'low', 'watch', 'high', 'critical'
    stress_score = Column(Float, nullable=True)
    surcharge_risk = Column(String, nullable=True)
    
    is_demo = Column(Boolean, default=False)
    
    geom = Column(Geometry('POINT', srid=4326), nullable=False)
