from fastapi import APIRouter, Query
import sqlite3
import json
import os
from typing import Optional

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../sales_data_api.db"))
MEMBERS_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../members.db"))

@router.get("")
def get_all_transactions(date: Optional[str] = Query(None, description="Filter by transaction date (YYYY-MM-DD)")):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT raw_json FROM api_transactions_raw")
    rows = cur.fetchall()
    transactions = [json.loads(row[0]) for row in rows]
    conn.close()

    # Filter by date if provided
    if date:
        transactions = [tx for tx in transactions if tx.get("transactionTimestamp", "").startswith(date)]

    # Build memberId -> name lookup
    members_conn = sqlite3.connect(MEMBERS_DB_PATH)
    members_cur = members_conn.cursor()
    members_cur.execute("SELECT memberId, firstName, lastName FROM members")
    member_lookup = {row[0]: f"{row[1]} {row[2]}".strip() for row in members_cur.fetchall()}
    members_conn.close()

    # Add memberName to each transaction
    for tx in transactions:
        member_id = tx.get("memberId")
        tx["memberName"] = member_lookup.get(member_id, "")

    return transactions 