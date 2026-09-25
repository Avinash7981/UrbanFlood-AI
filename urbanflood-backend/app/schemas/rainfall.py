import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class RainfallObservationBase(BaseModel):
    city_id: str
    intensity_mm_hr: float
    accumulation_mm: float
    source: str
    
class RainfallObservationCreate(RainfallObservationBase):
    pass

class RainfallObservation(RainfallObservationBase):
    id: int
    timestamp: datetime.datetime
    model_config = ConfigDict(from_attributes=True)
