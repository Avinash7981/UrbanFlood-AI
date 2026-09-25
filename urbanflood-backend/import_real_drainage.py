import os
import sys
import json
import logging
from sqlalchemy.orm import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import shape, LineString, MultiLineString, Point
import geopandas as gpd
from collections import defaultdict
import networkx as nx

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine, Base
from app.models.drainage import DrainSegment, NalaSegment, DrainNode

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
DRAINS_GEOJSON = "/Users/macbookairm4/Desktop/SIH/converted/hyderabad_drains.geojson"
NALAS_GEOJSON = "/Users/macbookairm4/Desktop/SIH/converted/hyderabad_nalas.geojson"
CITY_ID = "hyderabad"
TOLERANCE_METERS = 5.0 # Configurable topology snapping tolerance

def run_import():
    # Drop and recreate tables (for this script, we'll recreate the newly added models)
    logger.info("Recreating database tables...")
    Base.metadata.drop_all(bind=engine, tables=[DrainSegment.__table__, NalaSegment.__table__, DrainNode.__table__])
    Base.metadata.create_all(bind=engine, tables=[DrainSegment.__table__, NalaSegment.__table__, DrainNode.__table__])
    
    db = SessionLocal()
    
    # 1. Load GeoJSONs
    logger.info("Loading GeoJSON data...")
    try:
        gdf_drains = gpd.read_file(DRAINS_GEOJSON)
        gdf_nalas = gpd.read_file(NALAS_GEOJSON)
    except Exception as e:
        logger.error(f"Failed to read GeoJSON files: {e}")
        return
        
    logger.info(f"Loaded {len(gdf_drains)} drains and {len(gdf_nalas)} nalas.")
    
    # 2. Normalize CRS for distance calculations (UTM Zone 44N for Hyderabad)
    crs_projected = "EPSG:32644"
    gdf_drains_proj = gdf_drains.to_crs(crs_projected)
    gdf_nalas_proj = gdf_nalas.to_crs(crs_projected)
    
    # 3. Topology Extraction
    # We will iterate through all line segments, extract their endpoints, 
    # and snap them using a spatial index to form unique Node IDs.
    logger.info("Extracting graph topology...")
    
    G = nx.Graph() # Undirected graph since flow is unknown
    
    all_segments = []
    
    # Helper to process geodataframes
    def process_gdf(gdf, segment_type, prefix):
        for idx, row in gdf.iterrows():
            geom = row.geometry
            if not geom or geom.is_empty:
                continue
                
            if isinstance(geom, MultiLineString):
                # For simplicity, treat multilinestrings as disconnected components or flat them
                # Ideally, they are contiguous. We'll take the first and last point of the entire multi-geom
                # But it's better to break them into individual LineStrings if they are truly separate.
                # Assuming standard GIS, we just grab start of first line and end of last line
                lines = list(geom.geoms)
                start_pt = Point(lines[0].coords[0])
                end_pt = Point(lines[-1].coords[-1])
            elif isinstance(geom, LineString):
                start_pt = Point(geom.coords[0])
                end_pt = Point(geom.coords[-1])
            else:
                continue
                
            # Compute length in meters using projected CRS
            length_m = geom.length
            
            # Reproject geometry back to WGS84 for the database
            # We'll do it later or keep original geometry
            
            seg = {
                'id': f"{prefix}_{idx}",
                'type': segment_type,
                'start_pt': start_pt,
                'end_pt': end_pt,
                'length_m': length_m,
                'original_row': row
            }
            all_segments.append(seg)

    process_gdf(gdf_drains_proj, 'drain', 'DR')
    process_gdf(gdf_nalas_proj, 'nala', 'NL')
    
    # Snap endpoints to build nodes
    # We use a simple clustering approach since it's a python script
    # We'll use Shapely and STRtree for fast spatial queries
    from shapely.strtree import STRtree
    
    points = []
    point_to_seg = []
    
    for seg in all_segments:
        points.append(seg['start_pt'])
        point_to_seg.append((seg['id'], 'start'))
        points.append(seg['end_pt'])
        point_to_seg.append((seg['id'], 'end'))
        
    logger.info(f"Generated {len(points)} endpoints. Snapping with tolerance {TOLERANCE_METERS}m...")
    tree = STRtree(points)
    
    # Group points into nodes
    node_id_counter = 1
    point_visited = [False] * len(points)
    node_map = {} # point index -> node_id
    node_geoms = {} # node_id -> representative Point
    
    for i, pt in enumerate(points):
        if point_visited[i]:
            continue
            
        # Find all points within tolerance
        # STRtree query returns indices of geometries whose bounding box intersects
        # We buffer the point to do a proper distance query
        buffer = pt.buffer(TOLERANCE_METERS)
        matches = tree.query(buffer)
        
        node_id = f"ND_{node_id_counter}"
        node_id_counter += 1
        
        # Calculate centroid of cluster as the representative node geometry
        cluster_pts = []
        for match_idx in matches:
            if not point_visited[match_idx]:
                if points[match_idx].distance(pt) <= TOLERANCE_METERS:
                    point_visited[match_idx] = True
                    node_map[match_idx] = node_id
                    cluster_pts.append(points[match_idx])
                    
        # Centroid logic
        if cluster_pts:
            import statistics
            cx = statistics.mean([p.x for p in cluster_pts])
            cy = statistics.mean([p.y for p in cluster_pts])
            node_geoms[node_id] = Point(cx, cy)
            
    logger.info(f"Snapping complete. Formed {len(node_geoms)} unique nodes.")
    
    # Assign node IDs back to segments and build NetworkX graph
    for idx, seg in enumerate(all_segments):
        start_node_id = node_map[idx * 2]
        end_node_id = node_map[idx * 2 + 1]
        
        seg['start_node_id'] = start_node_id
        seg['end_node_id'] = end_node_id
        
        # Add to graph
        G.add_edge(start_node_id, end_node_id, segment_id=seg['id'], length_m=seg['length_m'])
        
    logger.info("Calculating network-derived metrics...")
    
    # Degree centrality (number of connections)
    degrees = dict(G.degree())
    
    # Connected component sizes (network influence)
    components = list(nx.connected_components(G))
    comp_size_map = {}
    for comp in components:
        size = len(comp)
        for n in comp:
            comp_size_map[n] = size
            
    # Calculate stress/criticality
    # High degree + large component = high influence. 
    # Without real hydraulics, we assign a relative criticality score.
    max_degree = max(degrees.values()) if degrees else 1
    max_comp = max(comp_size_map.values()) if comp_size_map else 1
    
    node_metrics = {}
    for n in G.nodes():
        deg = degrees.get(n, 0)
        comp_size = comp_size_map.get(n, 0)
        
        # Influence score: 0 to 100 based on component size and local degree
        inf_score = (comp_size / max_comp) * 50 + (deg / max_degree) * 50
        
        # Network-derived stress: 
        # For demo, if a node joins many pipes (high degree), it's a potential bottleneck
        if deg >= 4:
            stress = "critical"
        elif deg == 3:
            stress = "high"
        elif deg == 2:
            stress = "watch"
        else:
            stress = "low"
            
        node_metrics[n] = {
            'influence_score': round(inf_score, 2),
            'stress_level': stress,
            'degree': deg
        }
    
    # Convert node geometries back to WGS84 for database insertion
    logger.info("Inserting data into PostgreSQL...")
    import pyproj
    from shapely.ops import transform
    project_to_wgs84 = pyproj.Transformer.from_crs(crs_projected, "EPSG:4326", always_xy=True).transform
    
    # Insert Nodes
    for n_id, pt_proj in node_geoms.items():
        pt_wgs84 = transform(project_to_wgs84, pt_proj)
        geom_wkt = f"SRID=4326;{pt_wgs84.wkt}"
        
        metrics = node_metrics.get(n_id, {'influence_score': 0, 'stress_level': 'low', 'degree': 0})
        
        db_node = DrainNode(
            id=n_id,
            city_id=CITY_ID,
            node_type="junction" if metrics['degree'] > 1 else "endpoint",
            connected_segment_count=metrics['degree'],
            influence_score=metrics['influence_score'],
            criticality_score=metrics['influence_score'], # using same for now
            stress_level=metrics['stress_level'],
            is_demo=False,
            geom=geom_wkt
        )
        db.add(db_node)
        
    # Insert Segments
    # First, project original GeoDataFrames to WGS84 to store exact geometries
    gdf_drains_wgs84 = gdf_drains_proj.to_crs("EPSG:4326")
    gdf_nalas_wgs84 = gdf_nalas_proj.to_crs("EPSG:4326")
    
    wgs84_map = {}
    for idx, row in gdf_drains_wgs84.iterrows():
        wgs84_map[f"DR_{idx}"] = row.geometry
    for idx, row in gdf_nalas_wgs84.iterrows():
        wgs84_map[f"NL_{idx}"] = row.geometry
        
    for seg in all_segments:
        original_geom = wgs84_map[seg['id']]
        if original_geom.is_empty:
            continue
            
        geom_wkt = f"SRID=4326;{original_geom.wkt}"
        row = seg['original_row']
        
        if seg['type'] == 'drain':
            db_seg = DrainSegment(
                id=seg['id'],
                city_id=CITY_ID,
                source_id=str(row.get('FID', '')),
                category=str(row.get('Categories', '')),
                layer=str(row.get('Layer', '')),
                dr_code=str(row.get('DR_Code', '')),
                pi_code=str(row.get('PI_CODE', '')),
                length_m=seg['length_m'],
                upstream_node_id=seg['start_node_id'],
                downstream_node_id=seg['end_node_id'],
                flow_direction="UNKNOWN",
                is_demo=False,
                geom=geom_wkt
            )
            db.add(db_seg)
        else:
            db_seg = NalaSegment(
                id=seg['id'],
                city_id=CITY_ID,
                nala_id=str(row.get('Nala_ID', '')),
                nala_name=str(row.get('Nala_Name', '')),
                district=str(row.get('District', '')),
                mandal=str(row.get('Mandal', '')),
                zone_name=str(row.get('ZONE_NAME', '')),
                length_m=seg['length_m'],
                upstream_node_id=seg['start_node_id'],
                downstream_node_id=seg['end_node_id'],
                flow_direction="UNKNOWN",
                is_demo=False,
                geom=geom_wkt
            )
            db.add(db_seg)
            
    db.commit()
    logger.info("Import completed successfully!")
    db.close()

if __name__ == "__main__":
    run_import()
