import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.waterbody import WaterBody

router = APIRouter()

@router.get("/{city_id}/waterbodies")
def get_waterbodies(city_id: str, db: Session = Depends(get_db)) -> Any:
    # Use PostGIS to fetch the geometries as GeoJSON
    water_bodies = db.query(WaterBody, func.ST_AsGeoJSON(WaterBody.geom).label('geojson')).filter(WaterBody.city_id == city_id).all()
    
    features = []
    for wb, geojson_str in water_bodies:
        props = wb.__dict__.copy()
        props.pop('_sa_instance_state', None)
        props.pop('geom', None)
        
        # Ensure metadata_json is attached at the root properties level or as metadata_json
        
        features.append({
            "type": "Feature",
            "geometry": json.loads(geojson_str),
            "properties": props
        })
        
    return {
        "type": "FeatureCollection",
        "features": features
    }
