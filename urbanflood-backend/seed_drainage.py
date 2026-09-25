import json
from app.core.database import SessionLocal
from app.models.drainage import DrainageNode, DrainageSegment

# Hyderabad center roughly: 78.4867, 17.385
nodes_data = [
    {
        "id": "N1",
        "city_id": "hyderabad",
        "name": "Jubilee Hills Inlet A (DEMO)",
        "type": "inlet",
        "elevation": 530.0,
        "inlet_capacity": 5.0,
        "collection_area": 2.5,
        "incoming_flow": 2.0,
        "capacity": 10.0,
        "utilization": 20.0,
        "stress_level": "low",
        "criticality_score": 30.0,
        "upstream_node_count": 0,
        "downstream_node_count": 3,
        "is_demo": True,
        "lng": 78.4100,
        "lat": 17.4300
    },
    {
        "id": "N2",
        "city_id": "hyderabad",
        "name": "Banjara Hills Junction (DEMO)",
        "type": "junction",
        "elevation": 510.0,
        "inlet_capacity": None,
        "collection_area": 5.2,
        "incoming_flow": 15.0,
        "capacity": 20.0,
        "utilization": 75.0,
        "stress_level": "watch",
        "criticality_score": 65.0,
        "upstream_node_count": 1,
        "downstream_node_count": 2,
        "is_demo": True,
        "lng": 78.4300,
        "lat": 17.4100
    },
    {
        "id": "N3",
        "city_id": "hyderabad",
        "name": "Panjagutta Main Hub (DEMO)",
        "type": "manhole",
        "elevation": 490.0,
        "inlet_capacity": 10.0,
        "collection_area": 12.5,
        "incoming_flow": 45.0,
        "capacity": 40.0,
        "utilization": 112.5,
        "stress_level": "critical",
        "surcharge_risk": "high",
        "criticality_score": 95.0,
        "upstream_node_count": 2,
        "downstream_node_count": 1,
        "is_demo": True,
        "lng": 78.4500,
        "lat": 17.4200
    },
    {
        "id": "N4",
        "city_id": "hyderabad",
        "name": "Hussain Sagar Outfall (DEMO)",
        "type": "outfall",
        "elevation": 470.0,
        "inlet_capacity": None,
        "collection_area": 0.0,
        "incoming_flow": 45.0,
        "capacity": 100.0,
        "utilization": 45.0,
        "stress_level": "low",
        "criticality_score": 85.0,
        "upstream_node_count": 3,
        "downstream_node_count": 0,
        "is_demo": True,
        "lng": 78.4700,
        "lat": 17.4300
    },
    {
        "id": "N5",
        "city_id": "hyderabad",
        "name": "Khairatabad Drain (DEMO)",
        "type": "manhole",
        "elevation": 500.0,
        "inlet_capacity": 5.0,
        "collection_area": 4.1,
        "incoming_flow": 12.0,
        "capacity": 15.0,
        "utilization": 80.0,
        "stress_level": "watch",
        "criticality_score": 50.0,
        "upstream_node_count": 0,
        "downstream_node_count": 1,
        "is_demo": True,
        "lng": 78.4600,
        "lat": 17.4100
    }
]

segments_data = [
    {
        "id": "S1",
        "city_id": "hyderabad",
        "name": "Jubilee-Banjara Link",
        "type": "secondary",
        "diameter": 1.2,
        "length": 2500,
        "slope": 0.008,
        "manning_n": 0.013,
        "capacity": 20.0,
        "flow_direction": "positive",
        "upstream_node_id": "N1",
        "downstream_node_id": "N2",
        "stress_level": "low",
        "risk_indicator": "Normal Operation",
        "is_potential_bottleneck": False,
        "is_demo": True,
        "coords": [[78.4100, 17.4300], [78.4300, 17.4100]]
    },
    {
        "id": "S2",
        "city_id": "hyderabad",
        "name": "Banjara-Panjagutta Main",
        "type": "primary",
        "diameter": 2.0,
        "length": 2200,
        "slope": 0.009,
        "manning_n": 0.013,
        "capacity": 40.0,
        "flow_direction": "positive",
        "upstream_node_id": "N2",
        "downstream_node_id": "N3",
        "stress_level": "watch",
        "risk_indicator": "Approaching Capacity",
        "is_potential_bottleneck": False,
        "is_demo": True,
        "coords": [[78.4300, 17.4100], [78.4500, 17.4200]]
    },
    {
        "id": "S3",
        "city_id": "hyderabad",
        "name": "Khairatabad Feeder",
        "type": "secondary",
        "diameter": 1.0,
        "length": 1500,
        "slope": 0.005,
        "manning_n": 0.014,
        "capacity": 15.0,
        "flow_direction": "positive",
        "upstream_node_id": "N5",
        "downstream_node_id": "N3",
        "stress_level": "watch",
        "risk_indicator": "Approaching Capacity",
        "is_potential_bottleneck": False,
        "is_demo": True,
        "coords": [[78.4600, 17.4100], [78.4500, 17.4200]]
    },
    {
        "id": "S4",
        "city_id": "hyderabad",
        "name": "Panjagutta Outfall Trunk",
        "type": "primary",
        "diameter": 2.5,
        "length": 2000,
        "slope": 0.004,
        "manning_n": 0.013,
        "capacity": 60.0,
        "flow_direction": "positive",
        "upstream_node_id": "N3",
        "downstream_node_id": "N4",
        "stress_level": "critical",
        "risk_indicator": "Surcharge/Backflow Risk",
        "is_potential_bottleneck": True,
        "is_demo": True,
        "coords": [[78.4500, 17.4200], [78.4700, 17.4300]]
    }
]

def seed():
    db = SessionLocal()
    try:
        db.query(DrainageSegment).delete()
        db.query(DrainageNode).delete()
        
        for nd in nodes_data:
            geom_wkt = f"SRID=4326;POINT({nd['lng']} {nd['lat']})"
            node = DrainageNode(
                id=nd['id'],
                city_id=nd['city_id'],
                name=nd['name'],
                type=nd['type'],
                elevation=nd['elevation'],
                inlet_capacity=nd['inlet_capacity'],
                collection_area=nd['collection_area'],
                incoming_flow=nd['incoming_flow'],
                capacity=nd['capacity'],
                utilization=nd['utilization'],
                stress_level=nd['stress_level'],
                surcharge_risk=nd.get('surcharge_risk'),
                criticality_score=nd['criticality_score'],
                upstream_node_count=nd['upstream_node_count'],
                downstream_node_count=nd['downstream_node_count'],
                is_demo=nd['is_demo'],
                geom=geom_wkt
            )
            db.add(node)
            
        for sd in segments_data:
            coord_str = ", ".join([f"{c[0]} {c[1]}" for c in sd['coords']])
            geom_wkt = f"SRID=4326;LINESTRING({coord_str})"
            seg = DrainageSegment(
                id=sd['id'],
                city_id=sd['city_id'],
                name=sd['name'],
                type=sd['type'],
                diameter=sd['diameter'],
                length=sd['length'],
                slope=sd['slope'],
                manning_n=sd['manning_n'],
                capacity=sd['capacity'],
                flow_direction=sd['flow_direction'],
                upstream_node_id=sd['upstream_node_id'],
                downstream_node_id=sd['downstream_node_id'],
                stress_level=sd['stress_level'],
                risk_indicator=sd['risk_indicator'],
                is_potential_bottleneck=sd['is_potential_bottleneck'],
                is_demo=sd['is_demo'],
                geom=geom_wkt
            )
            db.add(seg)
            
        db.commit()
        print("Successfully seeded drainage graph.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
