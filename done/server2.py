# server.py - FastAPI backend for Sales Dashboard

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import sqlite3
import os
import datetime
import pandas as pd
from app.routers import sales_export_import

DB_PATH = "sales_data.db"
RAW_TABLE = "raw_sales"
GUESTS_DB_PATH = "guests.db"
EMPLOYEES_DB_PATH = "employees.db"
KPI_DB_PATH = "clubKPI.db"
MEMBERSHIPS_DB_PATH = "memberships.db"

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def query_db(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=404, detail="Sales database not found.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def query_employees_db(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    if not os.path.exists(EMPLOYEES_DB_PATH):
        raise HTTPException(status_code=404, detail="Employees database not found.")
    conn = sqlite3.connect(EMPLOYEES_DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def query_kpi_db(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    if not os.path.exists(KPI_DB_PATH):
        raise HTTPException(status_code=404, detail="KPI Database not found.")
    conn = sqlite3.connect(KPI_DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def execute_kpi_db(query: str, params: tuple = ()) -> None:
    if not os.path.exists(KPI_DB_PATH):
        raise HTTPException(status_code=404, detail="KPI Database not found.")
    conn = sqlite3.connect(KPI_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    conn.close()

def query_memberships_db(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    if not os.path.exists(MEMBERSHIPS_DB_PATH):
        raise HTTPException(status_code=404, detail="Memberships database not found.")
    conn = sqlite3.connect(MEMBERSHIPS_DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def execute_memberships_db(query: str, params: tuple = ()) -> None:
    if not os.path.exists(MEMBERSHIPS_DB_PATH):
        raise HTTPException(status_code=404, detail="Memberships database not found.")
    conn = sqlite3.connect(MEMBERSHIPS_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    conn.close()

@app.on_event("startup")
def ensure_dbs_exist():
    for path in (DB_PATH, GUESTS_DB_PATH, EMPLOYEES_DB_PATH, KPI_DB_PATH, MEMBERSHIPS_DB_PATH):
        if not os.path.exists(path):
            raise RuntimeError(f"Missing database at {path}")

# --- Employees endpoints ---------------------------------------------------

@app.get("/api/employees", response_model=List[Dict[str, Any]])
def get_all_employees():
    return query_employees_db('''
        SELECT "Name" AS name
        FROM employees
        WHERE "Position" LIKE "Sales%"
        ORDER BY
            CASE "Position"
                WHEN 'Sales - General Manager' THEN 1
                WHEN 'Sales - Assistant General Manager' THEN 2
                WHEN 'Sales - Sales Manager' THEN 3
                WHEN 'Sales - Fitness Facilitator' THEN 4
                WHEN 'Sales - Receptionist' THEN 5
                ELSE 6
            END,
            "Name"
    ''')

@app.get("/api/employees/all")
def get_all_employees_full():
    return query_employees_db('SELECT * FROM employees ORDER BY "Name"')

@app.post("/api/employees")
def add_employee(data: Dict[str, Any] = Body(...)):
    fields = ['"Active"', '"Barcode"', '"Name"', '"Position"', '"Profit Center"', '"hired"']
    placeholders = ", ".join("?" for _ in fields)
    values = [
        data.get("active", ""), data.get("barcode", ""),
        data.get("name", ""), data.get("position", ""),
        data.get("profitCenter", ""), data.get("hired", "")
    ]
    conn = sqlite3.connect(EMPLOYEES_DB_PATH)
    cur = conn.cursor()
    cur.execute(f'INSERT INTO employees ({", ".join(fields)}) VALUES ({placeholders})', values)
    conn.commit()
    conn.close()
    return {"success": True}

@app.put("/api/employees/{name}")
def update_employee(name: str, data: Dict[str, Any] = Body(...)):
    fields = ["Active", "Barcode", "Name", "Position", "Profit Center", "hired"]
    updates, values = [], []
    for field, key in zip(fields, ["active","barcode","name","position","profitCenter","hired"]):
        if key in data:
            updates.append(f'"{field}" = ?')
            values.append(data[key])
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")
    values.append(name)
    conn = sqlite3.connect(EMPLOYEES_DB_PATH)
    cur = conn.cursor()
    cur.execute(f'UPDATE employees SET {", ".join(updates)} WHERE "Name" = ?', values)
    conn.commit()
    conn.close()
    return {"success": True}

@app.delete("/api/employees/{name}")
def delete_employee(name: str):
    conn = sqlite3.connect(EMPLOYEES_DB_PATH)
    cur = conn.cursor()
    cur.execute('DELETE FROM employees WHERE "Name" = ?', (name,))
    conn.commit()
    conn.close()
    return {"success": True}

# --- Sales summary endpoints ------------------------------------------------

@app.get("/api/sales/stats")
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

@app.get("/api/sales/people")
def get_salespeople_breakdown():
    return query_db("""
        SELECT
            sales_person,
            COUNT(*) AS sale_count,
            SUM(total_amount) AS nb_cash
        FROM sales
        WHERE sales_person IS NOT NULL AND sales_person != ''
        GROUP BY sales_person
        ORDER BY nb_cash DESC
    """)

@app.get("/api/sales/person/{name}")
def get_sales_by_person(name: str):
    return query_db("""
        SELECT sale_id, agreement_number, profit_center, total_amount, transaction_count, main_item
        FROM sales
        WHERE sales_person = ?
        ORDER BY total_amount DESC
    """, (name,))

@app.get("/api/sales/daily")
def get_today_sales():
    today = datetime.date.today().isoformat()
    return query_db("SELECT * FROM transactions WHERE payment_date = ?", (today,))

@app.get("/api/sales/month-to-date")
def get_month_to_date_sales():
    first = datetime.date.today().replace(day=1).isoformat()
    return query_db("SELECT * FROM transactions WHERE payment_date >= ?", (first,))

@app.get("/api/sales/items/top")
def get_top_items():
    return query_db("""
        SELECT item, COUNT(*) AS count, SUM(amount) AS revenue
        FROM transactions
        WHERE item != ''
        GROUP BY item
        ORDER BY count DESC
        LIMIT 10
    """)

@app.get("/api/sales/raw")
def get_raw_transactions():
    return query_db("SELECT * FROM raw_sales LIMIT 100")

@app.get("/api/sales/view/{sale_id}")
def get_sale_details(sale_id: str):
    return query_db("SELECT * FROM transactions WHERE sale_id = ?", (sale_id,))

@app.post("/api/sales/load-raw")
def load_raw_sales(csv_path: str):
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail="CSV file not found")
    df = pd.read_csv(csv_path)
    df["source_date"] = pd.to_datetime("today").strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    df.to_sql(RAW_TABLE, conn, if_exists="append", index=False)
    conn.close()
    return {"success": True, "rows_loaded": len(df)}

@app.get("/api/sales/nb-promo")
def get_nb_promo_totals():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    yesterday = "2025-05-05"
    cur.execute("SELECT SUM(total_amount) AS mtd_total FROM sales WHERE profit_center='New Business'")
    mtd = cur.fetchone()["mtd_total"] or 0
    cur.execute(
        "SELECT SUM(total_amount) AS yesterday_total FROM sales WHERE profit_center='New Business' AND latest_payment_date = ?",
        (yesterday,)
    )
    yesterday_total = cur.fetchone()["yesterday_total"] or 0
    conn.close()
    return {"mtd": round(mtd,2), "nb_yesterday": round(yesterday_total,2)}

@app.get("/api/sales/promo-only")
def get_promo_totals():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    yesterday = "2025-05-05"
    cur.execute("SELECT SUM(total_amount) AS mtd_total FROM sales WHERE profit_center='Promotion'")
    mtd = cur.fetchone()["mtd_total"] or 0
    cur.execute(
        "SELECT SUM(total_amount) AS yesterday_total FROM sales WHERE profit_center='Promotion' AND latest_payment_date = ?",
        (yesterday,)
    )
    yesterday_total = cur.fetchone()["yesterday_total"] or 0
    conn.close()
    return {"mtd": round(mtd,2), "promo_yesterday": round(yesterday_total,2)}

# --- Editable Sales endpoints -----------------------------------------------

@app.get("/api/sales/all", response_model=List[Dict[str, Any]])
def get_all_sales():
    return query_db("SELECT * FROM sales ORDER BY sale_id")

@app.put("/api/sales/{sale_id}")
def update_sale(sale_id: str, data: Dict[str, Any] = Body(...)):
    allowed = {
        "agreement_number","profit_center","total_amount","transaction_count",
        "main_item","member_name","membership_type","agreement_type",
        "agreement_payment_plan","payment_method","latest_payment_date",
        "commission_employees","sales_person"
    }
    updates, params = [], []
    for key, val in data.items():
        if key in allowed:
            updates.append(f"{key} = ?")
            params.append(val)
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing valid to update.")
    params.append(sale_id)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(f"UPDATE sales SET {', '.join(updates)} WHERE sale_id = ?", params)
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/api/sales")
def create_sale(data: Dict[str, Any] = Body(...)):
    required = {"agreement_number","profit_center","total_amount"}
    if not required.issubset(data):
        raise HTTPException(status_code=400, detail="Missing required sale fields.")
    cols, vals = list(data.keys()), list(data.values())
    placeholder = ",".join("?" for _ in cols)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(f"INSERT INTO sales ({','.join(cols)}) VALUES ({placeholder})", vals)
    new_id = cur.lastrowid
    conn.commit()
    conn.close()
    return {"success": True, "sale_id": new_id}

@app.delete("/api/sales/{sale_id}")
def delete_sale(sale_id: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM sales WHERE sale_id = ?", (sale_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# --- NB Cash detail entries -------------------------------------------------

@app.get("/api/sales/nb-cash-entries", response_model=List[Dict[str, Any]])
def get_nb_cash_entries():
    return query_db("""
        SELECT
            sale_id,
            member_name,
            membership_type,
            total_amount,
            commission_employees,
            sales_person,
            latest_payment_date
        FROM sales
        WHERE profit_center = 'New Business'
    """)

# --- EFT detail entries -----------------------------------------------------

@app.get("/api/sales/eft-entries", response_model=List[Dict[str, Any]])
def get_eft_entries():
    """
    Returns every sale joined with its membership price,
    so the frontend can sum EFT per person.
    """
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
        WHERE s.sales_person IS NOT NULL AND s.sales_person != ''
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Memberships endpoints --------------------------------------------------

@app.get("/api/memberships", response_model=List[Dict[str, Any]])
def get_memberships():
    return query_memberships_db(
        "SELECT id, membership_type, price, other_names FROM memberships ORDER BY id"
    )

@app.get("/api/memberships/{membership_id}", response_model=Dict[str, Any])
def get_membership(membership_id: int):
    rows = query_memberships_db(
        "SELECT id, membership_type, price, other_names FROM memberships WHERE id = ?",
        (membership_id,)
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Membership not found.")
    return rows[0]

@app.post("/api/memberships", status_code=201)
def create_membership(data: Dict[str, Any] = Body(...)):
    required = {"membership_type", "price"}
    if not required.issubset(data):
        raise HTTPException(status_code=400, detail="Missing required membership fields.")
    execute_memberships_db(
        "INSERT INTO memberships (membership_type, price, other_names) VALUES (?, ?, ?)",
        (data["membership_type"], data["price"], data.get("other_names", ""))
    )
    conn = sqlite3.connect(MEMBERSHIPS_DB_PATH)
    new_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()[0]
    conn.close()
    return {"success": True, "id": new_id}

@app.put("/api/memberships/{membership_id}")
def update_membership(membership_id: int, data: Dict[str, Any] = Body(...)):
    allowed = {"membership_type", "price", "other_names"}
    updates, params = [], []
    for key in allowed:
        if key in data:
            updates.append(f"{key} = ?")
            params.append(data[key])
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")
    params.append(membership_id)
    execute_memberships_db(
        f"UPDATE memberships SET {', '.join(updates)} WHERE id = ?",
        tuple(params)
    )
    return {"success": True}

@app.delete("/api/memberships/{membership_id}")
def delete_membership(membership_id: int):
    execute_memberships_db(
        "DELETE FROM memberships WHERE id = ?",
        (membership_id,)
    )
    return {"success": True}

app.include_router(sales_export_import.router, prefix='/api')
