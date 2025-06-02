# app/db.py

import os
import shutil
import sqlite3
from datetime import datetime
from fastapi import HTTPException
from typing import List, Dict, Any

DB_PATH = "sales_data.db"
EMPLOYEES_DB_PATH = "employees.db"
KPI_DB_PATH = "clubKPI.db"
MEMBERSHIPS_DB_PATH = "memberships.db"
GUESTS_DB_PATH = "guests.db"
FIRST_WORKOUTS_DB_PATH = "firstWorkouts.db"

# Directory where backups will be stored
BACKUP_DIR = "db_backups"

def _ensure_backup_dir():
    """Create the backup directory if it does not exist."""
    if not os.path.isdir(BACKUP_DIR):
        os.makedirs(BACKUP_DIR, exist_ok=True)

def _daily_backup(path: str):
    """
    Make a daily backup of the given SQLite file, if one
    doesn't already exist for today.
    """
    _ensure_backup_dir()
    basename = os.path.basename(path)
    today_str = datetime.now().strftime("%Y%m%d")
    backup_name = f"{os.path.splitext(basename)[0]}_{today_str}.db.bak"
    backup_path = os.path.join(BACKUP_DIR, backup_name)

    # Only copy if today's backup does not already exist
    if not os.path.exists(backup_path):
        shutil.copy2(path, backup_path)

def _connect(path: str) -> sqlite3.Connection:
    """
    Ensure the file exists, then open a connection. 
    If connecting to the main sales_data.db, perform a daily backup.
    """
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Database not found at {path}")

    # For the primary DB (sales_data), we make a daily backup
    if path == DB_PATH:
        _daily_backup(path)

    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def query_db(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """
    Run a SELECT (or other read) on sales_data.db and return a list of dicts.
    """
    conn = _connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def execute_db(query: str, params: tuple = ()) -> None:
    """
    Run INSERT/UPDATE/DELETE on sales_data.db. A daily backup is made
    automatically (in _connect) before this write if one doesn't exist for today.
    """
    conn = _connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    conn.close()

def query_employees(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = _connect(EMPLOYEES_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def execute_employees(query: str, params: tuple = ()) -> None:
    conn = _connect(EMPLOYEES_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    conn.close()

def query_kpi(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = _connect(KPI_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def execute_kpi(query: str, params: tuple = ()) -> None:
    conn = _connect(KPI_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    conn.close()

def query_memberships(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = _connect(MEMBERSHIPS_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def execute_memberships(query: str, params: tuple = ()) -> None:
    conn = _connect(MEMBERSHIPS_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    conn.close()

def query_guests(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = _connect(GUESTS_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def query_first_workouts(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = _connect(FIRST_WORKOUTS_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def execute_first_workouts(query: str, params: tuple = ()) -> None:
    conn = _connect(FIRST_WORKOUTS_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    conn.close()
