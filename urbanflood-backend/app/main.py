from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, Base
from app.api.api_v1 import api_router
from app.api.endpoints import city, drainage, waterbodies, terrain

# Create database tables (For prototype; in prod use Alembic)
Base.metadata.create_all(bind=engine)

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Serve static tiles for MapLibre
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(city.router, prefix=f"{settings.API_V1_STR}/cities", tags=["cities"])
app.include_router(drainage.router, prefix=f"{settings.API_V1_STR}/cities", tags=["drainage"])
app.include_router(waterbodies.router, prefix=f"{settings.API_V1_STR}/cities", tags=["waterbodies"])
app.include_router(terrain.router, prefix=f"{settings.API_V1_STR}/cities/{{city_id}}/terrain", tags=["terrain"])

@app.get("/health", tags=["Health"])
def health_check():
    # Check DB connection
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "database": db_status
    }

# Include routers
app.include_router(api_router, prefix=settings.API_V1_STR)
