from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
import sqlite3

from app.db import query_kpi, execute_kpi

router = APIRouter(
    prefix="/api/kpi",
    tags=["kpi"],
    responses={404: {"description": "Not found"}},
)

@router.get("/goals")
def get_kpi_goals():
    try:
        return query_kpi("SELECT * FROM kpi_goals ORDER BY id")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/goals/{metric_name}")
def get_kpi_goal_by_metric(metric_name: str):
    try:
        results = query_kpi(
            "SELECT * FROM kpi_goals WHERE metric_name = ?",
            (metric_name,)
        )
        if not results:
            raise HTTPException(status_code=404, detail="KPI goal not found")
        return results[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/goals/{metric_name}")
def update_kpi_goal(metric_name: str, data: Dict[str, Any] = Body(...)):
    goal_value = data.get("goal_value")
    if goal_value is None:
        raise HTTPException(status_code=400, detail="goal_value is required")
    try:
        execute_kpi(
            """
            UPDATE kpi_goals 
            SET goal_value = ?, updated_at = CURRENT_TIMESTAMP
            WHERE metric_name = ?
            """,
            (goal_value, metric_name)
        )
        return {"success": True, "metric_name": metric_name, "new_goal_value": goal_value}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/goals")
def create_kpi_goal(data: Dict[str, Any] = Body(...)):
    metric_name = data.get("metric_name")
    goal_value  = data.get("goal_value")
    if not metric_name or goal_value is None:
        raise HTTPException(status_code=400, detail="metric_name and goal_value are required")
    try:
        execute_kpi(
            "INSERT INTO kpi_goals (metric_name, goal_value) VALUES (?, ?)",
            (metric_name, goal_value)
        )
        return {"success": True, "metric_name": metric_name, "goal_value": goal_value}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Metric name already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/goals/{metric_name}")
def delete_kpi_goal(metric_name: str):
    try:
        execute_kpi("DELETE FROM kpi_goals WHERE metric_name = ?", (metric_name,))
        return {"success": True, "deleted": metric_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/goals/bulk-update")
def bulk_update_kpi_goals(data: List[Dict[str, Any]] = Body(...)):
    try:
        for item in data:
            name = item.get("metric_name")
            val  = item.get("goal_value")
            if name and val is not None:
                execute_kpi(
                    """
                    UPDATE kpi_goals
                    SET goal_value = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE metric_name = ?
                    """,
                    (val, name)
                )
        return {"success": True, "updated_count": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pt-quotas")
def get_pt_quotas():
    try:
        quota_keys = [
            "nbpromo_quota_gm", "nbpromo_quota_agm",
            "fept_quota_gm", "fept_quota_agm",
            "pt_quota_new_fd", "pt_quota_renew_fd",
            "pt_quota_new_wfd", "pt_quota_renew_wfd",
            "neweft_quota_gm", "neweft_quota_agm",
            "collections_quota", "pif_renewals_quota",
            "abc_dues_quota",
            "coordinator_bonus_quota"
        ]
        results = query_kpi(
            f"SELECT metric_name, goal_value FROM kpi_goals WHERE metric_name IN ({','.join(['?']*len(quota_keys))})",
            tuple(quota_keys)
        )
        return {row["metric_name"]: row["goal_value"] for row in results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
