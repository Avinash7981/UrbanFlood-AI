import json
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.drainage import DrainNode, DrainSegment, NalaSegment
from app.schemas.drainage import (
    DrainageNodeCollection,
    DrainageSegmentCollection,
    DrainageNetwork,
    DrainageStatistics,
    SimulateFailureRequest,
    SimulateFailureResponse,
    TraceRequest,
    TraceResponse,
    GeoJSONPoint,
    GeoJSONLineString
)

router = APIRouter()

@router.get("/{city_id}/drainage/network", response_model=DrainageNetwork)
def get_drainage_network(city_id: str, db: Session = Depends(get_db)) -> Any:
    nodes = db.query(DrainNode, func.ST_AsGeoJSON(DrainNode.geom).label('geojson')).filter(DrainNode.city_id == city_id).all()
    drains = db.query(DrainSegment, func.ST_AsGeoJSON(DrainSegment.geom).label('geojson')).filter(DrainSegment.city_id == city_id).all()
    nalas = db.query(NalaSegment, func.ST_AsGeoJSON(NalaSegment.geom).label('geojson')).filter(NalaSegment.city_id == city_id).all()
    
    node_features = []
    for node, geojson_str in nodes:
        props = node.__dict__.copy()
        props.pop('_sa_instance_state', None)
        props.pop('geom', None)
        
        node_features.append({
            "type": "Feature",
            "geometry": json.loads(geojson_str),
            "properties": props
        })
        
    segment_features = []
    for seg, geojson_str in drains:
        props = seg.__dict__.copy()
        props.pop('_sa_instance_state', None)
        props.pop('geom', None)
        props['type'] = 'drain'
        
        segment_features.append({
            "type": "Feature",
            "geometry": json.loads(geojson_str),
            "properties": props
        })
        
    for seg, geojson_str in nalas:
        props = seg.__dict__.copy()
        props.pop('_sa_instance_state', None)
        props.pop('geom', None)
        props['type'] = 'nala'
        
        segment_features.append({
            "type": "Feature",
            "geometry": json.loads(geojson_str),
            "properties": props
        })

    return {
        "nodes": {
            "type": "FeatureCollection",
            "features": node_features
        },
        "segments": {
            "type": "FeatureCollection",
            "features": segment_features
        }
    }

@router.get("/{city_id}/drainage/statistics", response_model=DrainageStatistics)
def get_statistics(city_id: str, db: Session = Depends(get_db)) -> Any:
    total_nodes = db.query(DrainNode).filter(DrainNode.city_id == city_id).count()
    total_drains = db.query(DrainSegment).filter(DrainSegment.city_id == city_id).count()
    total_nalas = db.query(NalaSegment).filter(NalaSegment.city_id == city_id).count()
    
    healthy = db.query(DrainNode).filter(DrainNode.city_id == city_id, DrainNode.stress_level == 'low').count()
    watch = db.query(DrainNode).filter(DrainNode.city_id == city_id, DrainNode.stress_level.in_(['watch', 'medium'])).count()
    critical = db.query(DrainNode).filter(DrainNode.city_id == city_id, DrainNode.stress_level == 'critical').count()
    
    bottlenecks = 0 # Not directly tracking this yet in the new schema
    
    highest_collection = db.query(DrainNode).filter(DrainNode.city_id == city_id).order_by(DrainNode.influence_score.desc()).first()
    highest_stress = db.query(DrainNode).filter(DrainNode.city_id == city_id).order_by(DrainNode.stress_level.desc()).first()
    most_critical = db.query(DrainNode).filter(DrainNode.city_id == city_id).order_by(DrainNode.criticality_score.desc()).first()
    
    return {
        "total_nodes": total_nodes,
        "total_segments": total_drains + total_nalas,
        "healthy_nodes": healthy,
        "watch_nodes": watch,
        "critical_nodes": critical,
        "bottleneck_segments": bottlenecks,
        "highest_collection_node_id": highest_collection.id if highest_collection else None,
        "highest_stress_node_id": highest_stress.id if highest_stress else None,
        "most_critical_node_id": most_critical.id if most_critical else None,
    }

@router.post("/{city_id}/drainage/simulate-failure", response_model=SimulateFailureResponse)
def simulate_failure(city_id: str, req: SimulateFailureRequest, db: Session = Depends(get_db)) -> Any:
    node = db.query(DrainNode).filter(DrainNode.city_id == city_id, DrainNode.id == req.node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    all_nodes = db.query(DrainNode).filter(DrainNode.city_id == city_id).all()
    all_drains = db.query(DrainSegment).filter(DrainSegment.city_id == city_id).all()
    all_nalas = db.query(NalaSegment).filter(NalaSegment.city_id == city_id).all()
    all_segments = all_drains + all_nalas
    
    # Adjacency list: for UNKNOWN direction we treat as undirected
    adj = {}
    node_map = {n.id: n for n in all_nodes}
    
    for seg in all_segments:
        # Undirected edge since direction is mostly UNKNOWN
        # We will simulate blockage spreading in all connected directions (backflow)
        if seg.upstream_node_id:
            if seg.upstream_node_id not in adj: adj[seg.upstream_node_id] = []
            adj[seg.upstream_node_id].append(seg)
        if seg.downstream_node_id:
            if seg.downstream_node_id not in adj: adj[seg.downstream_node_id] = []
            adj[seg.downstream_node_id].append(seg)
            
    affected_nodes = set()
    affected_segments = set()
    queue = [req.node_id]
    
    # We will spread failure up to 3 hops (simulating localized surcharge)
    distances = {req.node_id: 0}
    
    while queue:
        curr = queue.pop(0)
        curr_dist = distances[curr]
        
        if curr_dist >= 3: # Configurable hop limit for simulation
            continue
            
        for seg in adj.get(curr, []):
            if seg.id not in affected_segments:
                affected_segments.add(seg.id)
                next_node = seg.downstream_node_id if seg.upstream_node_id == curr else seg.upstream_node_id
                if next_node and next_node not in affected_nodes:
                    affected_nodes.add(next_node)
                    distances[next_node] = curr_dist + 1
                    queue.append(next_node)
                    
    return {
        "blocked_node_id": req.node_id,
        "affected_upstream_nodes": list(affected_nodes),
        "affected_upstream_segments": list(affected_segments),
        "status": "simulated"
    }

@router.post("/{city_id}/drainage/trace", response_model=TraceResponse)
def trace_network(city_id: str, req: TraceRequest, db: Session = Depends(get_db)) -> Any:
    node = db.query(DrainNode).filter(DrainNode.city_id == city_id, DrainNode.id == req.node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    all_drains = db.query(DrainSegment).filter(DrainSegment.city_id == city_id).all()
    all_nalas = db.query(NalaSegment).filter(NalaSegment.city_id == city_id).all()
    all_segments = all_drains + all_nalas
    
    # Since flow direction is UNKNOWN, we just do an undirected connectivity trace
    # To represent "upstream" and "downstream", in an unknown network, they are effectively the same:
    # "All connected geometry"
    
    adj = {}
    for seg in all_segments:
        if seg.upstream_node_id:
            if seg.upstream_node_id not in adj: adj[seg.upstream_node_id] = []
            adj[seg.upstream_node_id].append(seg)
        if seg.downstream_node_id:
            if seg.downstream_node_id not in adj: adj[seg.downstream_node_id] = []
            adj[seg.downstream_node_id].append(seg)
                
    traced_nodes = set()
    traced_segments = set()
    queue = [req.node_id]
    
    while queue:
        curr = queue.pop(0)
        
        for edge in adj.get(curr, []):
            if edge.id not in traced_segments:
                traced_segments.add(edge.id)
                next_node = edge.downstream_node_id if edge.upstream_node_id == curr else edge.upstream_node_id
                if next_node and next_node not in traced_nodes:
                    traced_nodes.add(next_node)
                    queue.append(next_node)
                    
    return {
        "node_id": req.node_id,
        "direction": req.direction,
        "traced_nodes": list(traced_nodes),
        "traced_segments": list(traced_segments),
        "node_count": len(traced_nodes),
        "segment_count": len(traced_segments)
    }
