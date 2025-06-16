# scripts/process_guests.py

import pandas as pd
from app.db import GUESTS_DB_PATH
import sqlite3
import os

def run():
    csv_filename = "guests.csv"

    if not os.path.exists(csv_filename):
        return {"success": False, "error": f"{csv_filename} not found."}

    df = pd.read_csv(csv_filename)
    df.columns = [col.strip().replace(" ", "_").lower() for col in df.columns]

    conn = sqlite3.connect(GUESTS_DB_PATH)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS guests (
        id INTEGER PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        visit_type TEXT,
        source TEXT,
        created_at TEXT,
        salesperson TEXT,
        phone_mobile TEXT,
        notes TEXT
    )
    """)

    df.to_sql("guests", conn, if_exists="replace", index=False)
    conn.close()

    return {"success": True, "rows_inserted": len(df)}
