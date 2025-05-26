# app/routers/sales.py

from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
import sqlite3
import datetime
from app.db import DB_PATH, query_db, execute_db

router = APIRouter(prefix="/api/sales", tags=["sales"])

@router.get("/stats")
def get_summary():
    return query_db("""
        SELECT
            COUNT(*)           AS total_sales,
            SUM(total_amount)  AS total_revenue,
            AVG(total_amount)  AS avg_sale_amount,
            COUNT(DISTINCT member_name)    AS unique_members,
            COUNT(DISTINCT profit_center)  AS unique_profit_centers
        FROM sales
    """)[0]

@router.get("/people")
def salespeople_breakdown():
    return query_db("""
        SELECT
            sales_person,
            COUNT(*) AS sale_count,
            SUM(total_amount) AS nb_cash
        FROM sales
        WHERE sales_person <> ''
        GROUP BY sales_person
        ORDER BY nb_cash DESC
    """)

@router.get("/person/{name}")
def sales_by_person(name: str):
    return query_db("""
        SELECT sale_id, agreement_number, profit_center, total_amount, transaction_count, main_item
        FROM sales
        WHERE sales_person = ?
        ORDER BY total_amount DESC
    """, (name,))

@router.get("/daily")
def today_sales():
    today = datetime.date.today().isoformat()
    return query_db("SELECT * FROM transactions WHERE payment_date = ?", (today,))

@router.get("/month-to-date")
def mtd_sales():
    first = datetime.date.today().replace(day=1).isoformat()
    return query_db("SELECT * FROM transactions WHERE payment_date >= ?", (first,))

@router.get("/items/top")
def top_items():
    return query_db("""
        SELECT item, COUNT(*) AS count, SUM(amount) AS revenue
        FROM transactions
        WHERE item != ''
        GROUP BY item
        ORDER BY count DESC
        LIMIT 10
    """)

@router.get("/raw")
def raw_sales():
    return query_db("SELECT * FROM raw_sales LIMIT 100")

@router.get("/view/{sale_id}")
def sale_details(sale_id: str):
    return query_db("SELECT * FROM transactions WHERE sale_id = ?", (sale_id,))

@router.post("/load-raw")
def load_raw(csv_path: str = Body(..., embed=True)):
    import pandas as pd
    if not sqlite3.os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="CSV file not found")
    df = pd.read_csv(csv_path)
    df["source_date"] = datetime.date.today().isoformat()
    conn = sqlite3.connect(DB_PATH)
    df.to_sql("raw_sales", conn, if_exists="append", index=False)
    conn.close()
    return {"success": True, "rows_loaded": len(df)}

@router.get("/nb-cash-entries")
def nb_cash_entries():
    return query_db("""
        SELECT sale_id, member_name, membership_type, total_amount,
               commission_employees, sales_person, latest_payment_date
        FROM sales
        WHERE profit_center = 'New Business'
    """)

@router.get("/all")
def all_sales():
    return query_db("SELECT * FROM sales ORDER BY sale_id")

@router.put("/{sale_id}")
def update_sale(sale_id: str, data: Dict[str, Any] = Body(...)):
    allowed = {
        "agreement_number","profit_center","total_amount","transaction_count",
        "main_item","member_name","membership_type","agreement_type",
        "agreement_payment_plan","payment_method","latest_payment_date",
        "commission_employees","sales_person"
    }
    updates, vals = [], []
    for k, v in data.items():
        if k in allowed:
            updates.append(f"{k} = ?")
            vals.append(v)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing valid to update.")
    vals.append(sale_id)
    execute_db(f"UPDATE sales SET {', '.join(updates)} WHERE sale_id = ?", tuple(vals))
    return {"success": True}

@router.post("")
def create_sale(data: Dict[str, Any] = Body(...)):
    required = {"agreement_number","profit_center","total_amount"}
    if not required.issubset(data):
        raise HTTPException(status_code=400, detail="Missing required sale fields.")
    cols, vals = list(data.keys()), list(data.values())
    placeholders = ",".join("?" for _ in cols)
    execute_db(f"INSERT INTO sales ({','.join(cols)}) VALUES ({placeholders})", tuple(vals))
    return {"success": True}

@router.delete("/{sale_id}")
def delete_sale(sale_id: str):
    execute_db("DELETE FROM sales WHERE sale_id = ?", (sale_id,))
    return {"success": True}

@router.get("/nb-promo")
def get_nb_promo_totals():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    mtd = cur.execute(
        "SELECT SUM(total_amount) AS mtd_total FROM sales WHERE profit_center='New Business'"
    ).fetchone()["mtd_total"] or 0.0
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    yesterday_total = cur.execute(
        """
        SELECT SUM(total_amount) AS yesterday_total
        FROM sales
        WHERE profit_center='New Business'
          AND latest_payment_date = ?
        """, (yesterday,)
    ).fetchone()["yesterday_total"] or 0.0
    conn.close()
    return {"mtd": round(mtd,2), "nb_yesterday": round(yesterday_total,2)}

@router.get("/promo-only")
def get_promo_totals():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    mtd = cur.execute(
        "SELECT SUM(total_amount) AS mtd_total FROM sales WHERE profit_center='Promotion'"
    ).fetchone()["mtd_total"] or 0.0
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    yesterday_total = cur.execute(
        """
        SELECT SUM(total_amount) AS yesterday_total
        FROM sales
        WHERE profit_center='Promotion'
          AND latest_payment_date = ?
        """, (yesterday,)
    ).fetchone()["yesterday_total"] or 0.0
    conn.close()
    return {"mtd": round(mtd,2), "promo_yesterday": round(yesterday_total,2)}

@router.get("/abc-sections", response_model=Dict[str, float])
def get_abc_sections():
    """
    Return MTD totals for profit_centers A, B, and C—and their combined sum.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    first_of_month = datetime.date.today().replace(day=1).isoformat()

    results: Dict[str, float] = {}
    for section in ["A", "B", "C"]:
        cur.execute(
            "SELECT SUM(total_amount) AS total_mtd "
            "FROM sales "
            "WHERE profit_center = ? AND latest_payment_date >= ?",
            (section, first_of_month)
        )
        val = cur.fetchone()["total_mtd"] or 0.0
        results[f"total_{section}_mtd"] = float(val)

    # Add combined A+B+C total
    results["total_abc_mtd"] = (
        results["total_A_mtd"]
      + results["total_B_mtd"]
      + results["total_C_mtd"]
    )

    conn.close()
    return results
