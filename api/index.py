from __future__ import annotations

import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse as _BaseJSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.routes import categories as categories_router
from app.routes import dashboard as dashboard_router
from app.routes import pages as pages_router
from app.routes import transactions as transactions_router


BASE_DIR = Path(__file__).resolve().parents[1]


class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    """Força navegadores a sempre revalidar arquivos /static (evita cache velho de JS/CSS)."""
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        path = request.url.path or ""
        if path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        else:
            response.headers["Cache-Control"] = "no-cache, max-age=0"
        return response


class DecimalSafeJSONResponse(_BaseJSONResponse):
    """Response JSON que NUNCA transforma Decimal em float.
    Evita bugs de 0.1 + 0.2 = 0.30000000000000004 em valores financeiros.
    Todo Decimal é serializado como STRING com EXATAMENTE 2 casas decimais (ex: "17500.00").
    O frontend parseia essa string corretamente via MCF._parseMoneyValue / Number().
    """
    media_type = "application/json"

    @staticmethod
    def _default(o):
        import datetime as _dt
        from uuid import UUID
        if isinstance(o, Decimal):
            q = Decimal("0.01")
            return format(o.quantize(q, rounding=ROUND_HALF_UP), "f")
        if isinstance(o, UUID):
            return str(o)
        if isinstance(o, (_dt.datetime, _dt.date)):
            return o.isoformat()
        if isinstance(o, set):
            return list(o)
        raise TypeError(f"Tipo {type(o).__name__} não é serializável para JSON.")

    def render(self, content) -> bytes:
        # ensure_ascii=False → emojis / acentos corretos
        return json.dumps(
            content,
            default=DecimalSafeJSONResponse._default,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
        ).encode("utf-8")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Meu Controle Financeiro",
        description=(
            "Controle financeiro pessoal com receitas, despesas, dashboard "
            "e persistência no Supabase."
        ),
        version="1.0.0",
        default_response_class=DecimalSafeJSONResponse,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    app.add_middleware(NoCacheStaticMiddleware)

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
