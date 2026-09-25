from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import models, schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.City])
def read_cities(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve cities.
    """
    cities = db.query(models.City).offset(skip).limit(limit).all()
    return cities

@router.post("/", response_model=schemas.City)
def create_city(
    *,
    db: Session = Depends(get_db),
    city_in: schemas.CityCreate,
) -> Any:
    """
    Create new city.
    """
    city = db.query(models.City).filter(models.City.id == city_in.id).first()
    if city:
        raise HTTPException(status_code=400, detail="City already exists in the system.")
    city = models.City(**city_in.model_dump())
    db.add(city)
    db.commit()
    db.refresh(city)
    return city

@router.get("/{id}", response_model=schemas.City)
def read_city(
    *,
    db: Session = Depends(get_db),
    id: str,
) -> Any:
    """
    Get city by ID.
    """
    city = db.query(models.City).filter(models.City.id == id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    return city
