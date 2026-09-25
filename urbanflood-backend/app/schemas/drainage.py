from typing import List, Optional
from pydantic import BaseModel

# --- Geometry Types ---
class GeoJSONPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float] # [lng, lat]

class GeoJSONLineString(BaseModel):
    type: str = "LineString"
    coordinates: List[List[float]] # [[lng, lat], [lng, lat]]

class GeoJSONMultiLineString(BaseModel):
    type: str = "MultiLineString"
    coordinates: List[List[List[float]]] # [[[lng, lat], ...], ...]

# --- Nodes ---
class DrainageNodeProperties(BaseModel):
    id: str
    node_type: str
    connected_segment_count: int
    upstream_segment_count: int
    downstream_segment_count: int
    collection_area: Optional[float] = None
    influence_score: Optional[float] = None
    criticality_score: Optional[float] = None
    stress_level: str
    stress_score: Optional[float] = None
    surcharge_risk: Optional[str] = None
    is_demo: bool = False

class DrainageNodeFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONPoint
    properties: DrainageNodeProperties

class DrainageNodeCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[DrainageNodeFeature]

# --- Segments ---
class DrainageSegmentProperties(BaseModel):
    id: str
    source_id: Optional[str] = None
    source_type: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    layer: Optional[str] = None
    dr_code: Optional[str] = None
    pi_code: Optional[str] = None
    nala_id: Optional[str] = None
    nala_name: Optional[str] = None
    zone_name: Optional[str] = None
    length_m: Optional[float] = None
    upstream_node_id: Optional[str] = None
    downstream_node_id: Optional[str] = None
    flow_direction: Optional[str] = None
    is_demo: bool = False

class DrainageSegmentFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONLineString | GeoJSONMultiLineString
    properties: DrainageSegmentProperties

class DrainageSegmentCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[DrainageSegmentFeature]

# --- Network (Combined) ---
class DrainageNetwork(BaseModel):
    nodes: DrainageNodeCollection
    segments: DrainageSegmentCollection

# --- Statistics ---
class DrainageStatistics(BaseModel):
    total_nodes: int
    total_segments: int
    healthy_nodes: int
    watch_nodes: int
    critical_nodes: int
    bottleneck_segments: int
    highest_collection_node_id: Optional[str] = None
    highest_stress_node_id: Optional[str] = None
    most_critical_node_id: Optional[str] = None

# --- Simulation ---
class SimulateFailureRequest(BaseModel):
    node_id: str

class SimulateFailureResponse(BaseModel):
    blocked_node_id: str
    affected_upstream_nodes: List[str]
    affected_upstream_segments: List[str]
    status: str = "simulated"

class TraceRequest(BaseModel):
    node_id: str
    direction: str # 'upstream' or 'downstream'

class TraceResponse(BaseModel):
    node_id: str
    direction: str
    traced_nodes: List[str]
    traced_segments: List[str]
    node_count: int
    segment_count: int
