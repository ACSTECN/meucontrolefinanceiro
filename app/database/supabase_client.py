from __future__ import annotations

import os
from typing import Optional, TYPE_CHECKING

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:  # pragma: no cover - dotenv opcional em produção
    pass

if TYPE_CHECKING:
    from supabase import Client as SupabaseClientType

_SUPABASE_CLIENT: Optional["SupabaseClientType"] = None


def get_supabase() -> Optional["SupabaseClientType"]:
    global _SUPABASE_CLIENT
    if _SUPABASE_CLIENT is not None:
        return _SUPABASE_CLIENT

    url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        return None

    try:
        from supabase import create_client
        _SUPABASE_CLIENT = create_client(url, service_key)
    except Exception:
        _SUPABASE_CLIENT = None
    return _SUPABASE_CLIENT
