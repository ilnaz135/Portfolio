"""Portfolio backend entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import ensure_database_schema
from app.core.exceptions import (
    PortfolioException,
    general_exception_handler,
    portfolio_exception_handler,
    sqlalchemy_exception_handler,
)
from app.core.logging import setup_logging
from app.routes import api_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Ensure the database schema is ready before serving requests."""

    await ensure_database_schema()
    yield


def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""

    setup_logging()

    app = FastAPI(
        title=settings.app_name,
        description=settings.app_description,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_exception_handler(PortfolioException, portfolio_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=settings.cors_allow_methods,
        allow_headers=settings.cors_allow_headers,
    )

    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_application()


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
