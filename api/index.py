from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.routes import categories as categories_router
from app.routes import dashboard as dashboard_router
from app.routes import pages as pages_router
from app.routes import transactions as transactions_router


BASE_DIR = Path(__file__).resolve().parents[1]


def create_app() -> FastAPI:
    app = FastAPI(
        title="Meu Controle Financeiro",
        description=(
            "Controle financeiro pessoal com receitas, despesas, dashboard "
            "e persistência no Supabase."
        ),
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    static_dir = BASE_DIR / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    app.include_router(pages_router.router)
    app.include_router(categories_router.router)
    app.include_router(dashboard_router.router)
    app.include_router(transactions_router.router)

    @app.get("/healthz", tags=["meta"])
    def healthz():
        return {"ok": True}

    return app


app = create_app()
