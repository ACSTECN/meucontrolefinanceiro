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

    templates_dir = BASE_DIR / "templates"
    app.state.BASE_DIR = BASE_DIR
    app.state.TEMPLATES_DIR = templates_dir

    app.include_router(pages_router.router)
    app.include_router(categories_router.router)
    app.include_router(dashboard_router.router)
    app.include_router(transactions_router.router)

    @app.get("/healthz", tags=["meta"])
    def healthz():
        return {"ok": True}

    return app


app = create_app()


def _build_mangum_handler():
    try:
        from mangum import Mangum

        return Mangum(app, lifespan="off")
    except Exception:
        return None


_mangum_handler = _build_mangum_handler()


def handler(event, context):
    """Handler para Lambda (usado por Mangum quando disponível)."""
    if _mangum_handler is not None:
        return _mangum_handler(event, context)
    raise RuntimeError(
        "Mangum não está disponível. Instale as dependências: pip install -r requirements.txt"
    )


default_handler = handler
