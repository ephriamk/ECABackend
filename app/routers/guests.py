from fastapi import APIRouter
from typing import List, Dict, Any
from app.db import query_db

router = APIRouter(prefix="/api/guests", tags=["guests"])

@router.get("/visit-types", response_model=List[Dict[str, Any]])
def get_visit_types():
    # if table doesn't exist, return empty
    try:
        return query_db("SELECT * FROM visit_types")
    except Exception:
        return []
