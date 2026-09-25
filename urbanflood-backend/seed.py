import requests
import json

cities = [
    {
        "id": "hyderabad",
        "name": "Hyderabad",
        "state": "Telangana",
        "country": "India",
        "center_lng": 78.4867,
        "center_lat": 17.385,
        "zoom": 12,
        "data_sources": [
            {
                "id": "real_drains",
                "name": "Hyderabad Drains",
                "type": "drainage",
                "provider": "file",
                "status": "available"
            },
            {
                "id": "real_nalas",
                "name": "Hyderabad Nalas",
                "type": "drainage",
                "provider": "file",
                "status": "available"
            }
        ],
        "enabled_layers": [],
        "status": "active_pilot",
        "timezone": "Asia/Kolkata"
    }
]

for city in cities:
    r = requests.post("http://localhost:8000/api/v1/cities", json=city)
    print(r.status_code, r.text)
