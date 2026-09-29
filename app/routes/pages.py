from __future__ import annotations

import datetime
import os
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates


BASE_DIR = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = BASE_DIR / "templates"

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

router = APIRouter(tags=["pages"])


def _render(request: Request, template_name: str, **extra):
    ctx = {
        "title_extra": extra.pop("title_extra", ""),
        "today": datetime.date.today(),
        "env_note": " (Modo local - Supabase ausente)"
        if not (os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
        else "",
    }
    ctx.update(extra)
    template = templates.get_template(template_name)
    html = template.render(ctx, request=request)
    return HTMLResponse(content=html, media_type="text/html; charset=utf-8")


@router.get("/", response_class=HTMLResponse)
def dashboard_page(request: Request):
    return _render(
        request,
        "dashboard.html",
        title_extra="Dashboard",
    )


@router.get("/lancamentos", response_class=HTMLResponse)
def lancamentos_page(request: Request):
    return _render(
        request,
        "lancamentos.html",
        title_extra="Lançamentos",
    )


@router.get("/novo", response_class=HTMLResponse)
def novo_lancamento_page(request: Request):
    return _render(
        request,
        "novo_lancamento.html",
        title_extra="Novo Lançamento",
    )


@router.get("/editar", response_class=HTMLResponse)
def editar_lancamento_page(request: Request):
    return _render(
        request,
        "editar_lancamento.html",
        title_extra="Editar Lançamento",
    )
