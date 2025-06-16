# app/routers/sales.py

from fastapi import APIRouter, HTTPException, Body, UploadFile, File, Form
from typing import List, Dict, Any
import sqlite3
import datetime
from app.db import DB_PATH, query_db, execute_db
from fastapi.responses import StreamingResponse, JSONResponse
import io
import csv
import pandas as pd
import os
import shutil

router = APIRouter(prefix="/api/sales", tags=["sales"])

ALLOWED_CSVS = {
    "all_sales_report.csv": "backend/all_sales_report.csv",
    "employees.csv": "backend/employees.csv",
    "guests.csv": "backend/guests.csv",
    "events.csv": "backend/app/scripts/events.csv",
}

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
    """
    Return all sales for NB Cash tracking:
    - All 'New Business' profit center entries
    - 'Promotion' profit center entries where main_item starts with 'UPG' or 'Guest Fee'
    Frontend will separate Promotion entries <= $20 into non-commissioned passes
    """
    return query_db("""
        SELECT 
            sale_id, 
            member_name, 
            total_amount,
            profit_center,
            main_item,
            commission_employees, 
            sales_person, 
            latest_payment_date
        FROM sales
        WHERE profit_center = 'New Business'
           OR (profit_center = 'Promotion' 
               AND (main_item LIKE 'UPG%' OR main_item LIKE 'Guest Fee%'))
        ORDER BY latest_payment_date DESC, sale_id DESC
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
        "commission_employees","sales_person",
        "manual_override"  # Allow manual_override to be updated
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
        """
        SELECT SUM(total_amount) AS mtd_total FROM sales
        WHERE profit_center='Promotion'
          AND (main_item IS NULL OR main_item NOT LIKE '%Downgrade%')
        """
    ).fetchone()["mtd_total"] or 0.0
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    yesterday_total = cur.execute(
        """
        SELECT SUM(total_amount) AS yesterday_total
        FROM sales
        WHERE profit_center='Promotion'
          AND latest_payment_date = ?
          AND (main_item IS NULL OR main_item NOT LIKE '%Downgrade%')
        """,
        (yesterday,)
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

# Debug endpoint to check what's in the database
@router.get("/debug/profit-centers")
def debug_profit_centers():
    """Debug endpoint to see what profit centers exist in your data"""
    return query_db("""
        SELECT 
            profit_center, 
            COUNT(*) as count,
            SUM(total_amount) as total_amount
        FROM sales 
        WHERE profit_center IS NOT NULL 
        GROUP BY profit_center 
        ORDER BY count DESC
    """)

@router.get("/debug/promotion-main-items")
def debug_promotion_main_items():
    """Debug endpoint to see what main_item values exist for Promotion profit center"""
    return query_db("""
        SELECT 
            main_item,
            COUNT(*) as count,
            SUM(total_amount) as total_amount,
            AVG(total_amount) as avg_amount
        FROM sales 
        WHERE profit_center = 'Promotion'
          AND main_item IS NOT NULL 
        GROUP BY main_item 
        ORDER BY count DESC
    """)

@router.get("/debug/payment-methods")
def debug_payment_methods():
    """Debug endpoint to see what payment methods exist"""
    return query_db("""
        SELECT 
            payment_method, 
            COUNT(*) as count
        FROM sales 
        WHERE payment_method IS NOT NULL 
        GROUP BY payment_method 
        ORDER BY count DESC
    """)

@router.get("/debug/recent-sales")
def debug_recent_sales():
    """Debug endpoint to see recent sales with all relevant fields"""
    return query_db("""
        SELECT 
            sale_id,
            member_name,
            profit_center,
            main_item,
            payment_method,
            total_amount,
            commission_employees,
            sales_person,
            latest_payment_date
        FROM sales 
        ORDER BY latest_payment_date DESC, sale_id DESC
        LIMIT 20
    """)

@router.get("/export-csv")
def export_sales_csv():
    """
    Export the entire sales table as a CSV file.
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT * FROM sales")
    rows = cur.fetchall()
    headers = [desc[0] for desc in cur.description]
    conn.close()

    def iter_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)
        for row in rows:
            writer.writerow(row)
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(iter_csv(), media_type="text/csv", headers={
        "Content-Disposition": "attachment; filename=sales_export.csv"
    })

@router.post("/import-csv")
def import_sales_csv(file: UploadFile = File(...)):
    """
    Replace the sales table with the uploaded CSV file. Backs up the DB file before replacing.
    """
    try:
        # Backup DB file first
        db_path = DB_PATH
        backup_path = db_path.replace('.db', '_backup.db')
        if os.path.exists(db_path):
            shutil.copy2(db_path, backup_path)
        # Read uploaded file into DataFrame
        df = pd.read_csv(file.file)
        # Validate required columns
        required_cols = {"sale_id", "agreement_number", "member_name", "sales_person", "profit_center", "main_item", "transaction_count", "total_amount", "commission_employees", "latest_payment_date"}
        if not required_cols.issubset(df.columns):
            return JSONResponse(status_code=400, content={"error": f"CSV missing required columns: {required_cols - set(df.columns)}"})
        # Replace table
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("DELETE FROM sales")
        conn.commit()
        df.to_sql("sales", conn, if_exists="append", index=False)
        conn.close()
        return {"success": True, "rows": len(df), "undo_available": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/undo-import")
def undo_import():
    """
    Restore the last backup of the sales DB (undo last import).
    """
    db_path = DB_PATH
    backup_path = db_path.replace('.db', '_backup.db')
    if not os.path.exists(backup_path):
        return JSONResponse(status_code=404, content={"error": "No backup available to restore."})
    try:
        # Replace the DB file with the backup
        shutil.copy2(backup_path, db_path)
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/undo-available")
def undo_available():
    """
    Returns {available: true/false} if a backup DB exists for undo.
    """
    db_path = DB_PATH
    backup_path = db_path.replace('.db', '_backup.db')
    return {"available": os.path.exists(backup_path)}

@router.post("/upload-csv")
def upload_csv(file: UploadFile = File(...), filename: str = Form(...)):
    if filename not in ALLOWED_CSVS:
        return JSONResponse(status_code=400, content={"error": "Invalid filename"})
    dest_path = ALLOWED_CSVS[filename]
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)  # Ensure directory exists
    try:
        with open(dest_path, "wb") as f:
            f.write(file.file.read())
        return {"success": True, "filename": filename}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/check-csv")
def check_csv(filename: str):
    if filename not in ALLOWED_CSVS:
        return JSONResponse(status_code=400, content={"error": "Invalid filename"})
    dest_path = ALLOWED_CSVS[filename]
    if os.path.exists(dest_path):
        return {"exists": True}
    else:
        return JSONResponse(status_code=404, content={"exists": False})

@router.get("/collections-dues")
def get_collections_dues():
    """
    Return sum of total_amount for all sales with profit_center containing 'POS Dues' (case-insensitive)
    for yesterday (today) and month-to-date (mtd).
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    first_of_month = datetime.date.today().replace(day=1).isoformat()
    # Case-insensitive, trimmed match for 'POS Dues'
    mtd = cur.execute(
        """
        SELECT SUM(total_amount) AS mtd_total FROM sales
        WHERE LOWER(TRIM(profit_center)) LIKE '%pos dues%'
          AND latest_payment_date >= ?
        """,
        (first_of_month,)
    ).fetchone()["mtd_total"] or 0.0
    today = cur.execute(
        """
        SELECT SUM(total_amount) AS today_total FROM sales
        WHERE LOWER(TRIM(profit_center)) LIKE '%pos dues%'
          AND latest_payment_date = ?
        """,
        (yesterday,)
    ).fetchone()["today_total"] or 0.0
    conn.close()
    return {"today": round(today, 2), "mtd": round(mtd, 2)}

@router.get("/pif-renewals-dues")
def get_pif_renewals_dues():
    """
    Return sum of total_amount for all sales with profit_center = 'PIF Renewals'
    for yesterday (today) and month-to-date (mtd).
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    first_of_month = datetime.date.today().replace(day=1).isoformat()
    mtd = cur.execute(
        """
        SELECT SUM(total_amount) AS mtd_total FROM sales
        WHERE profit_center = 'PIF Renewals'
          AND latest_payment_date >= ?
        """,
        (first_of_month,)
    ).fetchone()["mtd_total"] or 0.0
    today = cur.execute(
        """
        SELECT SUM(total_amount) AS today_total FROM sales
        WHERE profit_center = 'PIF Renewals'
          AND latest_payment_date = ?
        """,
        (yesterday,)
    ).fetchone()["today_total"] or 0.0
    conn.close()
    return {"today": round(today, 2), "mtd": round(mtd, 2)}