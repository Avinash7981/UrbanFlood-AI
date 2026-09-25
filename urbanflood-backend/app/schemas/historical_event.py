import datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any

class HistoricalFloodEventBase(BaseModel):
    id: str
    city_id: str
    date: datetime.datetime
    title: str
    severity: str
    max_rainfall_mm_hr: float
    total_rainfall_mm: float
    duration_hours: float
    affected_area_sq_km: float
    affected_zones: list[str] = []
    description: str
    rainfall_progression: list[dict[str, Any]] = []
    predicted_extent: Optional[dict[str, Any]] = None
    observed_extent: Optional[dict[str, Any]] = None
    metadata_obj: dict[str, Any] = {}

class HistoricalFloodEventCreate(HistoricalFloodEventBase):
    pass

class HistoricalFloodEvent(HistoricalFloodEventBase):
    model_config = ConfigDict(from_attributes=True)
