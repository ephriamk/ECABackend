# app/db.py

import os
import shutil
import sqlite3
from datetime import datetime
from fastapi import HTTPException
from typing import List, Dict, Any
import json
from .config import settings
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Fix database paths to point to the correct location in backend/
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "sales_data.db")
EMPLOYEES_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "employees.db")
KPI_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "clubKPI.db")
MEMBERSHIPS_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "memberships.db")
GUESTS_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "guests.db")
FIRST_WORKOUTS_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "firstWorkouts.db")
MEMBERS_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "members.db")
API_EVENTS_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "apiEvents.db")
STRUCTURED_EVENTS_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "structured_events.db")

# Directory where backups will be stored
BACKUP_DIR = "db_backups"

ABC_EVENTS_TABLE = "abc_events"
MEMBERS_TABLE = "members"
API_EVENTS_TABLE = "api_events"

# --- Database Engine Setup ---
engine = None
SessionLocal = None

# If DATABASE_URL is set in the environment, use PostgreSQL for production.
if settings.DATABASE_URL:
    print("INFO:     DATABASE_URL found, connecting to PostgreSQL.")
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Otherwise, we continue with the assumption of using local SQLite files.
else:
    print("INFO:     No DATABASE_URL found, falling back to local SQLite files.")

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

def query_structured_events(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """
    Run a SELECT on structured_events.db and return a list of dicts.
    """
    conn = _connect(STRUCTURED_EVENTS_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

def ensure_abc_events_table():
    conn = _connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(f'''
        CREATE TABLE IF NOT EXISTS {ABC_EVENTS_TABLE} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            eventId TEXT,
            event_json TEXT,
            fetched_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

def insert_abc_events(events: list):
    ensure_abc_events_table()
    conn = _connect(DB_PATH)
    cur = conn.cursor()
    now = datetime.now().isoformat()
    for event in events:
        event_id = event.get("eventId")
        cur.execute(f"INSERT OR REPLACE INTO {ABC_EVENTS_TABLE} (eventId, event_json, fetched_at) VALUES (?, ?, ?)",
                    (event_id, json.dumps(event), now))
    conn.commit()
    conn.close()

def get_abc_events():
    ensure_abc_events_table()
    conn = _connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(f"SELECT event_json FROM {ABC_EVENTS_TABLE}")
    rows = cur.fetchall()
    conn.close()
    return [json.loads(row[0]) for row in rows]

def ensure_members_table():
    conn = sqlite3.connect(MEMBERS_DB_PATH)
    cur = conn.cursor()
    cur.execute(f'''
        CREATE TABLE IF NOT EXISTS {MEMBERS_TABLE} (
            memberId TEXT PRIMARY KEY,
            firstName TEXT,
            lastName TEXT,
            email TEXT,
            primaryPhone TEXT,
            agreementNumber TEXT,
            membershipType TEXT,
            totalCheckInCount INTEGER,
            firstCheckInTimestamp TEXT,
            lastCheckInTimestamp TEXT,
            sinceDate TEXT,
            salesPersonName TEXT
        )
    ''')
    conn.commit()
    conn.close()

def insert_members(members: list):
    ensure_members_table()
    conn = sqlite3.connect(MEMBERS_DB_PATH)
    cur = conn.cursor()
    for m in members:
        cur.execute(f'''
            INSERT OR IGNORE INTO {MEMBERS_TABLE} (
                memberId, firstName, lastName, email, primaryPhone, agreementNumber, membershipType, totalCheckInCount, firstCheckInTimestamp, lastCheckInTimestamp, sinceDate, salesPersonName
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            m.get("memberId", ""),
            m.get("personal", {}).get("firstName", ""),
            m.get("personal", {}).get("lastName", ""),
            m.get("personal", {}).get("email", ""),
            m.get("personal", {}).get("primaryPhone", ""),
            m.get("agreement", {}).get("agreementNumber", ""),
            m.get("agreement", {}).get("membershipType", ""),
            m.get("agreement", {}).get("totalCheckInCount", 0),
            m.get("personal", {}).get("firstCheckInTimestamp", ""),
            m.get("personal", {}).get("lastCheckInTimestamp", ""),
            m.get("agreement", {}).get("sinceDate", ""),
            m.get("agreement", {}).get("salesPersonName", "")
        ))
    conn.commit()
    conn.close()

def get_members():
    ensure_members_table()
    conn = sqlite3.connect(MEMBERS_DB_PATH)
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {MEMBERS_TABLE}")
    rows = [dict(zip([column[0] for column in cur.description], row)) for row in cur.fetchall()]
    conn.close()
    return rows

def get_members_paginated(page=1, page_size=50, sort_by="memberId", sort_order="asc", name=None, email=None, status=None):
    ensure_members_table()
    offset = (page - 1) * page_size
    query = f"SELECT * FROM {MEMBERS_TABLE}"
    filters = []
    params = []
    if name:
        filters.append("(firstName LIKE ? OR lastName LIKE ?)")
        params.extend([f"%{name}%", f"%{name}%"])
    if email:
        filters.append("email LIKE ?")
        params.append(f"%{email}%")
    # Add more filters as needed
    if filters:
        query += " WHERE " + " AND ".join(filters)
    query += f" ORDER BY {sort_by} {sort_order.upper()}"
    query += " LIMIT ? OFFSET ?"
    params.extend([page_size, offset])
    conn = sqlite3.connect(MEMBERS_DB_PATH)
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(zip([column[0] for column in cur.description], row)) for row in cur.fetchall()]
    # Get total count for pagination
    count_query = f"SELECT COUNT(*) FROM {MEMBERS_TABLE}"
    count_params = params[:-2] if filters else []
    if filters:
        count_query += " WHERE " + " AND ".join(filters)
    count_cur = conn.cursor()
    count_cur.execute(count_query, count_params)
    total = count_cur.fetchone()[0]
    conn.close()
    return {"members": rows, "total": total}

def search_members(query, page=1, page_size=50):
    ensure_members_table()
    offset = (page - 1) * page_size
    sql = f"SELECT * FROM {MEMBERS_TABLE} WHERE firstName LIKE ? OR lastName LIKE ? OR email LIKE ?"
    params = [f"%{query}%", f"%{query}%", f"%{query}%"]
    sql += " LIMIT ? OFFSET ?"
    params.extend([page_size, offset])
    conn = sqlite3.connect(MEMBERS_DB_PATH)
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = [dict(zip([column[0] for column in cur.description], row)) for row in cur.fetchall()]
    # Get total count for pagination
    count_sql = f"SELECT COUNT(*) FROM {MEMBERS_TABLE} WHERE firstName LIKE ? OR lastName LIKE ? OR email LIKE ?"
    count_cur = conn.cursor()
    count_cur.execute(count_sql, params[:-2])
    total = count_cur.fetchone()[0]
    conn.close()
    return {"members": rows, "total": total}

def ensure_api_events_table():
    conn = sqlite3.connect(API_EVENTS_DB_PATH)
    cur = conn.cursor()
    cur.execute(f'''
        CREATE TABLE IF NOT EXISTS {API_EVENTS_TABLE} (
            eventId TEXT PRIMARY KEY,
            event_json TEXT,
            fetched_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

def insert_api_events(events: list):
    ensure_api_events_table()
    conn = sqlite3.connect(API_EVENTS_DB_PATH)
    cur = conn.cursor()
    now = datetime.now().isoformat()
    for event in events:
        event_id = event.get("eventId")
        cur.execute(f"INSERT OR REPLACE INTO {API_EVENTS_TABLE} (eventId, event_json, fetched_at) VALUES (?, ?, ?)",
                    (event_id, json.dumps(event), now))
    conn.commit()
    conn.close()

def get_api_events():
    ensure_api_events_table()
    conn = sqlite3.connect(API_EVENTS_DB_PATH)
    cur = conn.cursor()
    cur.execute(f"SELECT event_json FROM {API_EVENTS_TABLE}")
    rows = cur.fetchall()
    conn.close()
    return [json.loads(row[0]) for row in rows]

def insert_structured_events(events: list):
    """
    Insert a list of events into structured_events.db, populating both the events and event_members tables.
    Mirrors the logic of insert_api_events but for the new schema.
    """
    conn = _connect(STRUCTURED_EVENTS_DB_PATH)
    cur = conn.cursor()
    for event in events:
        event_id = event.get("eventId")
        if not event_id:
            continue
        # Insert into events table
        cur.execute('''
            INSERT OR REPLACE INTO events (
                eventId, eventName, eventTimestamp, status, employeeFirstName, employeeLastName, clubId
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            event_id,
            event.get('eventName'),
            event.get('eventTimestamp'),
            event.get('status'),
            event.get('employeeFirstName'),
            event.get('employeeLastName'),
            event.get('clubId')
        ))
        # Insert into event_members table
        if 'members' in event and isinstance(event['members'], list):
            for member in event['members']:
                cur.execute('''
                    INSERT INTO event_members (
                        eventId, memberId, firstName, lastName
                    ) VALUES (?, ?, ?, ?)
                ''', (
                    event_id,
                    member.get('memberId'),
                    member.get('firstName'),
                    member.get('lastName')
                ))
    conn.commit()
    conn.close()

def get_db_session():
    """
    Generator function that yields a PostgreSQL database session.
    Used for production deployment with PostgreSQL.
    """
    if not SessionLocal:
        raise HTTPException(status_code=500, detail="Database not configured for PostgreSQL")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _connect_sqlite(path: str) -> sqlite3.Connection:
    """
    Connect to a SQLite database file and return the connection.
    Used for local development with SQLite files.
    """
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Database not found at {path}")
    
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn
