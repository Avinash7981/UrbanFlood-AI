import datetime
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any

class FloodZoneBase(BaseModel):
    id: str
    city_id: str
    name: str
    risk_level: str
    probability: float
    severity: str
    estimated_onset_minutes: Optional[int] = None
    confidence: float
    factors: list[dict[str, Any]] = []
    is_demo: bool = False

class FloodZoneCreate(FloodZoneBase):
    pass

class FloodZone(FloodZoneBase):
    last_assessed: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
