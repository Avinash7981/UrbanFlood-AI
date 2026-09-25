import xml.etree.ElementTree as ET
import uuid
import json
from shapely.geometry import Polygon, MultiPolygon
from shapely.wkt import dumps
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.waterbody import WaterBody

engine = create_engine('postgresql+pg8000://postgres:postgres@localhost:5432/urbanflood')
Session = sessionmaker(bind=engine)
session = Session()

kml_file = "/Users/macbookairm4/Desktop/UrbanFlood AI/External DATA/Hyderabad - Tanks (Lakes).kml"
tree = ET.parse(kml_file)
root = tree.getroot()
namespace = {"kml": "http://www.opengis.net/kml/2.2"}

placemarks = root.findall(".//kml:Placemark", namespace)
print(f"Total placemarks in KML: {len(placemarks)}")

valid_geoms = 0
skipped_geoms = 0

for pm in placemarks:
    # Extract attributes
    extended_data = pm.find('kml:ExtendedData/kml:SchemaData', namespace)
    props = {}
    if extended_data is not None:
        for simple_data in extended_data.findall('kml:SimpleData', namespace):
            name = simple_data.get('name')
            text = simple_data.text
            if name:
                props[name] = text

    # Extract geometry
    polys = pm.findall(".//kml:Polygon", namespace)
    geom_list = []
    
    for poly in polys:
        coords_node = poly.find(".//kml:outerBoundaryIs/kml:LinearRing/kml:coordinates", namespace)
        if coords_node is None:
            # Fallback to general coordinates
            coords_node = poly.find(".//kml:coordinates", namespace)
            
        if coords_node is not None and coords_node.text:
            coords = []
            for pt_str in coords_node.text.strip().split():
                parts = pt_str.split(",")
                if len(parts) >= 2:
                    try:
                        x, y = float(parts[0]), float(parts[1])
                        coords.append((x, y))
                    except ValueError:
                        pass
            
            if len(coords) >= 3:
                # Ensure closed polygon
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                try:
                    geom_list.append(Polygon(coords))
                except Exception as e:
                    pass

    if geom_list:
        try:
            mp = MultiPolygon(geom_list)
            wkt_geom = dumps(mp)
            
            # Create WaterBody instance
            wb = WaterBody(
                id=str(uuid.uuid4()),
                city_id="hyderabad",
                name=props.get("Descr_1", "Unnamed Water Body"),
                type=props.get("LU_Code", "Unknown"),
                area=float(props.get("Shape_Area", 0)) if props.get("Shape_Area") else None,
                metadata_json=props,
                geom=f"SRID=4326;{wkt_geom}"
            )
            session.add(wb)
            valid_geoms += 1
        except Exception as e:
            skipped_geoms += 1
    else:
        skipped_geoms += 1

session.commit()
print(f"Valid Geometries Ingested: {valid_geoms}")
print(f"Skipped/Invalid Records: {skipped_geoms}")
print(f"Total Geometries Checked: {valid_geoms + skipped_geoms}")
