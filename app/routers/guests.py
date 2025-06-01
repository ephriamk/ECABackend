# app/routers/guests.py

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
import sqlite3
import os
import datetime

from app.db import GUESTS_DB_PATH  # make sure this points at your guests.db

router = APIRouter(prefix="/api/guests", tags=["guests"])

@router.get("/visit-types", response_model=Dict[str, Any])
def get_guest_visit_type_counts():
    try:
        if not os.path.exists(GUESTS_DB_PATH):
            raise HTTPException(status_code=404, detail="Guests database not found.")
        
        conn = sqlite3.connect(GUESTS_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # --- MTD data (counts by source) ---
        cursor.execute("""
            SELECT source, COUNT(*) AS count
            FROM guests
            GROUP BY source
            ORDER BY count DESC
        """)
        mtd_results = [dict(row) for row in cursor.fetchall()]

        # --- Yesterday’s date string ---
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        yesterday_str = yesterday.strftime("%Y-%m-%d")

        # --- “Yesterday” data (filter by created_at prefix) ---
        cursor.execute("""
            SELECT source, COUNT(*) AS count
            FROM guests
            WHERE SUBSTR(created_at, 1, 10) = ?
            GROUP BY source
            ORDER BY count DESC
        """, (yesterday_str,))
        today_results = [dict(row) for row in cursor.fetchall()]

        conn.close()

        return {
            "visit_type_counts": mtd_results,
            "today_counts":      today_results,
            "date_used":         yesterday_str
        }

    except HTTPException:
        # re-raise 404 if DB is missing
        raise
    except Exception as e:
        # unexpected errors
        raise HTTPException(status_code=500, detail=str(e))

# backend/app/routers/guests.py

@router.get("/by-source")
def get_guests_by_source(day: str, source: str):
    try:
        if not os.path.exists(GUESTS_DB_PATH):
            raise HTTPException(status_code=404, detail="Database not found.")

        source_map = {
            "Buddy Referral": ["Buddy Referral", "Buddy Referral (Member/Family/Friend)"],
            "Former Member": ["Former Member"],
            "Corporate": ["Corporate"],
            "Advertising": ["Advertising", "Advertising (Social Media/TV/Internet)", "tagJOIN", "29 Day Pass"],
            "Out of Area": ["Out of Town Guest"],
            "Class Pass": ["Class Pass"],
            "Underage": ["Under 18 guest"],
            "Other": ["", None],
        }

        real_sources = source_map.get(source, [source])
        query_date_filter = ""

        if day == "today":
            date_str = datetime.datetime.now() - datetime.timedelta(days=1)
            query_date_filter = f"AND SUBSTR(created_at, 1, 10) = '{date_str.strftime('%Y-%m-%d')}'"

        conn = sqlite3.connect(GUESTS_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        placeholders = ",".join(["?"] * len(real_sources))
        cursor.execute(f"""
            SELECT first_name, last_name
            FROM guests
            WHERE source IN ({placeholders}) {query_date_filter}
            ORDER BY created_at DESC
        """, tuple(real_sources))

        guests = [dict(row) for row in cursor.fetchall()]
        return {"guests": guests}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/all")
def get_all_guests():
    """Get all guest entries"""
    try:
        if not os.path.exists(GUESTS_DB_PATH):
            raise HTTPException(status_code=404, detail="Guests database not found.")
        
        conn = sqlite3.connect(GUESTS_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM guests ORDER BY created_at DESC")
        guests = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return guests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))