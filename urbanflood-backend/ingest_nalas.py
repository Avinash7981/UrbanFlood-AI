import xml.etree.ElementTree as ET
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.drainage import NalaSegment
import json

engine = create_engine('postgresql+pg8000://postgres:postgres@localhost:5432/urbanflood')
Session = sessionmaker(bind=engine)
session = Session()

# Parse the KML file
kml_file = "/Users/macbookairm4/Desktop/SIH/2.kml"
tree = ET.parse(kml_file)
root = tree.getroot()

namespace = {'kml': 'http://www.opengis.net/kml/2.2'}

updates = 0
for placemark in root.findall('.//kml:Placemark', namespace):
    extended_data = placemark.find('kml:ExtendedData/kml:SchemaData', namespace)
    if extended_data is not None:
        nala_id = None
        encr_data = {}
        for simple_data in extended_data.findall('kml:SimpleData', namespace):
            name = simple_data.get('name')
            text = simple_data.text
            if name == 'Nala_ID':
                nala_id = text
            elif name in ['Govt_Encr', 'Pvt_Encr', 'Rel_Encr', 'Total_Encr', 'Court_Case']:
                try:
                    encr_data[name] = int(text) if text else 0
                except ValueError:
                    encr_data[name] = 0

        if nala_id and encr_data:
            # Update the database
            segments = session.query(NalaSegment).filter(NalaSegment.nala_id == nala_id).all()
            for segment in segments:
                current_meta = segment.metadata_json or {}
                # Update only encroachment fields
                for k, v in encr_data.items():
                    current_meta[k] = v
                segment.metadata_json = current_meta
                session.add(segment)
                updates += 1

session.commit()
print(f"Successfully updated {updates} Nala segments with encroachment data.")
