from fastapi import APIRouter, HTTPException, Query
import os

router = APIRouter()

@router.get("/elevation")
def get_terrain_elevation(
    lon: float = Query(..., description="Longitude"),
    lat: float = Query(..., description="Latitude")
):
    """
    Looks up elevation at a specific coordinate from the actual DEM TIFF.
    """
    dem_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../External DATA/cdne44m_v3r1/cdne44m.tif"))
    if not os.path.exists(dem_path):
        raise HTTPException(status_code=503, detail="DEM dataset unavailable")

    try:
        import rasterio
        with rasterio.open(dem_path) as src:
            # Check if within bounds
            if not (src.bounds.left <= lon <= src.bounds.right and src.bounds.bottom <= lat <= src.bounds.top):
                return {"elevation": None, "message": "Coordinates out of DEM bounds"}
            
            # Sample value
            for val in src.sample([(lon, lat)]):
                elevation = float(val[0])
                if elevation < -9000 or elevation > 9000:  # simplistic NoData fallback
                    return {"elevation": None}
                return {"elevation": elevation}
    except ImportError:
        raise HTTPException(status_code=500, detail="rasterio not installed on backend")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return {"elevation": None}
