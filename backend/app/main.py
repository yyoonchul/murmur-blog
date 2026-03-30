import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings as app_settings
from app.features.personas.api import router as personas_router
from app.features.posts.api import router as posts_router
from app.features.settings.api import router as settings_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Monolog API", version="1.0.0")


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    msg = detail if isinstance(detail, str) else str(detail)
    return JSONResponse(status_code=exc.status_code, content={"error": msg})

app.add_middleware(
    CORSMiddleware,
    allow_origins=app_settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(personas_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "Monolog server is running"}


@app.get("/health")
def health_root():
    return {"status": "ok"}
