from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from app.db import query_memberships, execute_memberships

router = APIRouter(prefix="/api/memberships", tags=["memberships"])

@router.get("", response_model=List[Dict[str, Any]])
def list_memberships():
    return query_memberships(
        "SELECT id, membership_type, price, other_names FROM memberships ORDER BY id"
    )

@router.get("/{membership_id}", response_model=Dict[str, Any])
def get_membership(membership_id: int):
    rows = query_memberships(
        "SELECT id, membership_type, price, other_names FROM memberships WHERE id = ?",
        (membership_id,)
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Membership not found.")
    return rows[0]

@router.post("", status_code=201)
def create_membership(data: Dict[str, Any] = Body(...)):
    required = {"membership_type", "price"}
    if not required.issubset(data):
        raise HTTPException(status_code=400, detail="Missing required membership fields.")
    execute_memberships(
        "INSERT INTO memberships (membership_type, price, other_names) VALUES (?, ?, ?)",
        (data["membership_type"], data["price"], data.get("other_names", ""))
    )
    return {"success": True}

@router.put("/{membership_id}")
def update_membership(membership_id: int, data: Dict[str, Any] = Body(...)):
    allowed = {"membership_type", "price", "other_names"}
    updates, vals = [], []
    for k in allowed:
        if k in data:
            updates.append(f"{k} = ?")
            vals.append(data[k])
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")
    vals.append(membership_id)
    execute_memberships(f"UPDATE memberships SET {', '.join(updates)} WHERE id = ?", tuple(vals))
    return {"success": True}

@router.delete("/{membership_id}")
def delete_membership(membership_id: int):
    execute_memberships("DELETE FROM memberships WHERE id = ?", (membership_id,))
    return {"success": True}
