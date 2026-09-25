import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any

class FloodAlertBase(BaseModel):
    id: str
    city_id: str
    severity: str
    title: str
    description: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    estimated_onset_minutes: Optional[int] = None
    factors: list[str] = []
    status: str = "active"
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime.datetime] = None
    is_demo: bool = False

class FloodAlertCreate(FloodAlertBase):
    pass

class FloodAlert(FloodAlertBase):
    timestamp: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
