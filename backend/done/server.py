# server.py - FastAPI backend for Sales Dashboard

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import sqlite3
import os
import datetime
import pandas as pd
from app.routers import sales_export_import

DB_PATH = "sales_data.db"
RAW_TABLE = "raw_sales"

app = FastAPI()

# CORS settings for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def query_db(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Database not found.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(query, params)
    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

@app.get("/api/sales/stats")
def get_summary():
    query = """
        SELECT 
            COUNT(*) AS total_sales,
            SUM(total_amount) AS total_revenue,
            AVG(total_amount) AS avg_sale_amount,
            COUNT(DISTINCT member_name) AS unique_members,
            COUNT(DISTINCT profit_center) AS unique_profit_centers
        FROM sales
    """
    return query_db(query)[0]

@app.get("/api/sales/people")
def get_salespeople_breakdown():
    query = """
        SELECT sales_person, COUNT(*) as sale_count, SUM(total_amount) as nb_cash
        FROM sales
        WHERE sales_person IS NOT NULL AND sales_person != ''
        GROUP BY sales_person
        ORDER BY nb_cash DESC
    """
    return query_db(query)

@app.get("/api/sales/person/{name}")
def get_sales_by_person(name: str):
    query = """
        SELECT sale_id, agreement_number, profit_center, total_amount, transaction_count, main_item
        FROM sales
        WHERE sales_person = ?
        ORDER BY total_amount DESC
    """
    return query_db(query, (name,))

@app.get("/api/sales/daily")
def get_today_sales():
    today = datetime.date.today().isoformat()
    query = "SELECT * FROM transactions WHERE payment_date = ?"
    return query_db(query, (today,))

@app.get("/api/sales/month-to-date")
def get_month_to_date_sales():
    first_day = datetime.date.today().replace(day=1).isoformat()
    query = "SELECT * FROM transactions WHERE payment_date >= ?"
    return query_db(query, (first_day,))

@app.get("/api/sales/items/top")
def get_top_items():
    query = """
        SELECT item, COUNT(*) as count, SUM(amount) as revenue
        FROM transactions
        WHERE item != ''
        GROUP BY item
        ORDER BY count DESC
        LIMIT 10
    """
    return query_db(query)

@app.get("/api/sales/raw")
def get_raw_transactions():
    query = "SELECT * FROM raw_sales LIMIT 100"
    return query_db(query)

@app.get("/api/sales/view/{sale_id}")
def get_sale_details(sale_id: str):
    query = "SELECT * FROM transactions WHERE sale_id = ?"
    return query_db(query, (sale_id,))

@app.post("/api/sales/load-raw")
def load_raw_sales(csv_path: str):
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="CSV file not found")
    try:
        df = pd.read_csv(csv_path)
        df["source_date"] = pd.to_datetime("today").strftime("%Y-%m-%d")
        conn = sqlite3.connect(DB_PATH)
        df.to_sql(RAW_TABLE, conn, if_exists="append", index=False)
        conn.close()
        return {"success": True, "rows_loaded": len(df)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sales/nb-promo")
def get_nb_promo_totals():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Hardcoded demo date for "yesterday"
        hardcoded_yesterday = "2025-05-05"

        # MTD: all time since start of month
        cursor.execute("""
            SELECT SUM(total_amount) AS mtd_total FROM sales
            WHERE profit_center = 'New Business'
        """)
        mtd_total = cursor.fetchone()["mtd_total"] or 0

        # Hardcoded "yesterday" value for demo
        cursor.execute("""
            SELECT SUM(total_amount) AS yesterday_total FROM sales
            WHERE profit_center = 'New Business' AND latest_payment_date = ?
        """, (hardcoded_yesterday,))
        yesterday_total = cursor.fetchone()["yesterday_total"] or 0

        conn.close()

        return {
            "mtd": round(mtd_total, 2),
            "nb_yesterday": round(yesterday_total, 2)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sales/promo-only")
def get_promo_totals():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Hardcoded demo date
        hardcoded_yesterday = "2025-05-05"

        # MTD total for 'Promotion'
        cursor.execute("""
            SELECT SUM(total_amount) AS mtd_total FROM sales
            WHERE profit_center = 'Promotion'
        """)
        mtd_total = cursor.fetchone()["mtd_total"] or 0

        # Yesterday total for 'Promotion'
        cursor.execute("""
            SELECT SUM(total_amount) AS yesterday_total FROM sales
            WHERE profit_center = 'Promotion' AND latest_payment_date = ?
        """, (hardcoded_yesterday,))
        yesterday_total = cursor.fetchone()["yesterday_total"] or 0

        conn.close()

        return {
            "mtd": round(mtd_total, 2),
            "promo_yesterday": round(yesterday_total, 2)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(sales_export_import.router, prefix='/api')
