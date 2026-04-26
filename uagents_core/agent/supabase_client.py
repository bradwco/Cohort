import os

from supabase import Client, create_client

_url = os.environ.get("SUPABASE_URL")
_key = os.environ.get("SUPABASE_SERVICE_KEY")

if not _url or not _key:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment"
    )

supabase: Client = create_client(_url, _key)
