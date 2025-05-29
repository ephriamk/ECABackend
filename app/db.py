# app/db.py

import os
import sqlite3
from fastapi import HTTPException
from typing import List, Dict, Any

DB_PATH = "sales_data.db"
EMPLOYEES_DB_PATH = "employees.db"
KPI_DB_PATH = "clubKPI.db"
MEMBERSHIPS_DB_PATH = "memberships.db"
GUESTS_DB_PATH = "guests.db"
FIRST_WORKOUTS_DB_PATH = "firstWorkouts.db"

def _connect(path: str) -> sqlite3.Connection:
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Database not found at {path}")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def query_db(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn = _connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def execute_db(query: str, params: tuple = ()) -> None:
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
    