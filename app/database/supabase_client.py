from __future__ import annotations

import os
import ssl
from dataclasses import dataclass
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:  # pragma: no cover - dotenv opcional em produção
    pass


@dataclass
class SupabaseRestConfig:
    """Configuração estrita p/ API REST do Supabase (httpx direto).
    Não depende da biblioteca supabase-py, evita AttributeErrors de API
    inconsistente entre v1/v2 da lib."""

    rest_url: str
    service_role_key: str


_CONFIG: Optional[SupabaseRestConfig] = None


def get_supabase_rest_config() -> Optional[SupabaseRestConfig]:
    """Retorna (url_rest + service_key) se variáveis estiverem setadas."""
    global _CONFIG
    if _CONFIG is not None:
        return _CONFIG

    url = os.environ.get("SUPABASE_URL") or ""
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not service_key:
        return None

    # Garante URL base terminando com / para concatenar /rest/v1
    base = url.rstrip("/")
    rest_url = f"{base}/rest/v1"
    _CONFIG = SupabaseRestConfig(rest_url=rest_url, service_role_key=service_key)
    return _CONFIG


# Mantém compatibilidade com código legado (retorna None, código usa REST agora)
def get_supabase():
    return None
