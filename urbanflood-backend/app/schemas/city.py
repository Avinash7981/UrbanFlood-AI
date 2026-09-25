from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any

class CityBase(BaseModel):
    id: str
    name: str
    state: str
    country: str
    center_lng: float
    center_lat: float
    zoom: float = 11.0
    data_sources: list[dict[str, Any]] = []
    enabled_layers: list[str] = []
    status: str = "not_configured"
    population: Optional[float] = None
    area: Optional[float] = None
    timezone: str = "Asia/Kolkata"

class CityCreate(CityBase):
    pass

class City(CityBase):
    model_config = ConfigDict(from_attributes=True)
