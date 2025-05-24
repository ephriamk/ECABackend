from fastapi import APIRouter
from typing import List, Dict, Any
import sqlite3
from app.db import DB_PATH, MEMBERSHIPS_DB_PATH

router = APIRouter(prefix="/api/sales", tags=["eft"])

@router.get("/eft-entries", response_model=List[Dict[str, Any]])
def get_eft_entries():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(f"ATTACH DATABASE '{MEMBERSHIPS_DB_PATH}' AS mdb")
    rows = conn.execute("""
        SELECT
            s.sale_id,
            s.member_name,
            s.profit_center,
            s.commission_employees,
            s.sales_person,
            s.latest_payment_date,
            COALESCE(m.price, 0) AS price
        FROM sales AS s
        LEFT JOIN mdb.memberships AS m
          ON s.agreement_payment_plan = m.membership_type
        WHERE s.sales_person <> ''
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]
