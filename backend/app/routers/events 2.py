from fastapi import APIRouter, Query
from typing import List, Optional, Dict, Any
import sqlite3
import os
from datetime import datetime, timedelta
import requests
from fastapi.responses import JSONResponse
from app.db import insert_abc_events, get_abc_events

router = APIRouter(prefix="/api/events", tags=["events"])

DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'events.db')  # backend/events.db

# --- Name normalization/canonicalization helpers ---
def normalize_name(name: str) -> str:
    if not name:
        return ""
    name = ' '.join(name.split())
    if "," in name:
        parts = name.split(",", 1)
        last = parts[0].strip()
        first = parts[1].strip() if len(parts) > 1 else ""
        return f"{first} {last}".lower()
    return name.lower()

def canonicalize(raw: str, official: List[str]) -> str:
    n = normalize_name(raw)
    if not n:
        return ''
    direct = next((o for o in official if o.lower() == n.lower()), None)
    if direct:
        return direct
    normalized = n.lower()
    parts = normalized.split()
    best_match = None
    best_score = 0
    for official_name in official:
        official_lower = official_name.lower()
        official_parts = official_lower.split()
        score = 0
        all_parts_found = True
        for part in parts:
            if len(part) < 2:
                continue
            part_found = False
            for official_part in official_parts:
                if part == official_part:
                    score += 10
                    part_found = True
                    break
                if len(part) == 1 and official_part.startswith(part):
                    score += 5
                    part_found = True
                    break
                if len(part) >= 3 and official_part.startswith(part):
                    score += 7
                    part_found = True
                    break
            if not part_found and len(part) >= 3:
                all_parts_found = False
        if parts and official_parts:
            last_part = parts[-1]
            official_last = official_parts[-1]
            if last_part == official_last:
                score += 15
        if all_parts_found or score > 0:
            reverse_match = True
            for official_part in official_parts:
                if len(official_part) == 1:
                    continue
                found = False
                for part in parts:
                    if (
                        official_part == part or
                        (len(part) >= 3 and official_part.startswith(part)) or
                        (len(official_part) >= 3 and part.startswith(official_part))
                    ):
                        found = True
                        break
                if not found and len(official_part) >= 3:
                    reverse_match = False
            if reverse_match:
                score += 5
        if score > best_score:
            best_score = score
            best_match = official_name
    return best_match if best_score >= 15 and best_match else n

# --- Helper to get official trainers list ---
def get_trainer_names() -> List[str]:
    try:
        from app.db import query_employees
        rows = query_employees('''SELECT "Name" AS name FROM employees WHERE "Position" LIKE "%Trainer%" OR "Position" LIKE "%Fitness Director%"''')
        return [normalize_name(r['name']) for r in rows if r.get('name')]
    except Exception:
        return []

# --- Event type filters ---
FIRST_WORKOUT_TYPES = ["1st Workout", "First Workout"]
THIRTYDAY_REPROGRAM_TYPES = ["30 Day Reprogram", "30-Day Reprogram", "30 Day Re-Program"]
OTHER_REPROGRAM_TYPES = ["Other Reprogram", "Other Re-Program"]

# --- Utility: get yesterday and first of month ---
def get_dates():
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    first_of_month = today.replace(day=1)
    return today, yesterday, first_of_month

# --- Core event filter/count logic ---
def get_event_counts(event_types: List[str]) -> Dict[str, Dict[str, int]]:
    if not os.path.exists(DB_PATH):
        return {}
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM events WHERE event_type IN ({})".format(
        ','.join('?' for _ in event_types)), event_types)
    rows = cur.fetchall()
    conn.close()
    trainer_names = get_trainer_names()
    counts = {}
    today, yesterday, first_of_month = get_dates()
    for row in rows:
        emp_raw = row['employee_name'] or ''
        event_date_str = row['event_date']
        try:
            event_date = datetime.strptime(event_date_str, '%Y-%m-%d').date()
        except Exception:
            continue
        mapped = canonicalize(emp_raw, trainer_names)
        key = mapped if mapped in trainer_names else 'Other'
        if key not in counts:
            counts[key] = {'today': 0, 'mtd': 0}
        if event_date == yesterday:
            counts[key]['today'] += 1
        if event_date >= first_of_month:
            counts[key]['mtd'] += 1
    return counts

def get_event_details(event_types: List[str], trainer: Optional[str], period: str) -> List[Dict[str, Any]]:
    if not os.path.exists(DB_PATH):
        return []
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM events WHERE event_type IN ({})".format(
        ','.join('?' for _ in event_types)), event_types)
    rows = cur.fetchall()
    conn.close()
    trainer_names = get_trainer_names()
    today, yesterday, first_of_month = get_dates()
    results = []
    for row in rows:
        emp_raw = row['employee_name'] or ''
        event_date_str = row['event_date']
        try:
            event_date = datetime.strptime(event_date_str, '%Y-%m-%d').date()
        except Exception:
            continue
        mapped = canonicalize(emp_raw, trainer_names)
        key = mapped if mapped in trainer_names else 'Other'
        # Filter by trainer
        if trainer:
            if trainer == 'Other' and key != 'Other':
                continue
            if trainer != 'Other' and key != trainer:
                continue
        # Filter by period
        if period == 'today' and event_date != yesterday:
            continue
        if period == 'mtd' and event_date < first_of_month:
            continue
        results.append(dict(row))
    return results

# --- API endpoints ---
@router.get("/first-workout/counts", summary="Get 1st Workout event counts by trainer")
def first_workout_counts():
    return get_event_counts(FIRST_WORKOUT_TYPES)

@router.get("/first-workout/details", summary="Get 1st Workout event details for a trainer and period")
def first_workout_details(trainer: Optional[str] = Query(None), period: str = Query('mtd')):
    return get_event_details(FIRST_WORKOUT_TYPES, trainer, period)

@router.get("/thirtyday-reprogram/counts", summary="Get 30 Day Reprogram event counts by trainer")
def thirtyday_reprogram_counts():
    return get_event_counts(THIRTYDAY_REPROGRAM_TYPES)

@router.get("/thirtyday-reprogram/details", summary="Get 30 Day Reprogram event details for a trainer and period")
def thirtyday_reprogram_details(trainer: Optional[str] = Query(None), period: str = Query('mtd')):
    return get_event_details(THIRTYDAY_REPROGRAM_TYPES, trainer, period)

@router.get("/other-reprogram/counts", summary="Get Other Reprogram event counts by trainer")
def other_reprogram_counts():
    return get_event_counts(OTHER_REPROGRAM_TYPES)

@router.get("/other-reprogram/details", summary="Get Other Reprogram event details for a trainer and period")
def other_reprogram_details(trainer: Optional[str] = Query(None), period: str = Query('mtd')):
    return get_event_details(OTHER_REPROGRAM_TYPES, trainer, period)

@router.get("/", summary="List all events")
def list_events(event_type: Optional[str] = Query(None), employee: Optional[str] = Query(None)):
    if not os.path.exists(DB_PATH):
        return {"events": []}
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    query = "SELECT * FROM events WHERE 1=1"
    params = []
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)
    if employee:
        # Normalize for matching
        norm_emp = normalize_name(employee)
        # We'll do a LIKE match for flexibility
        query += " AND lower(employee_name) LIKE ?"
        params.append(f"%{norm_emp}%")
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"events": rows}

@router.get("/types", summary="List unique event types")
def list_event_types():
    if not os.path.exists(DB_PATH):
        return {"types": []}
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT event_type FROM events")
    types = [row[0] for row in cur.fetchall()]
    conn.close()
    return {"types": types} 

@router.get("/abcfinancial", summary="Get events from ABC Financial external API")
def get_abcfinancial_events():
    url = "https://api.abcfinancial.com/rest/40059/calendars/events?eventDateRange=2025-06-01&page=1"
    headers = {
        "Accept": "application/json;charset=UTF-8",
        "app_id": "4c9b9b55",
        "app_key": "112d217a8efeafb44fc9a7c1c34b357e"
    }
    response = requests.get(url, headers=headers)
    try:
        data = response.json()
    except Exception:
        return JSONResponse(content={"error": "Invalid JSON from ABC Financial API", "raw": response.text}, status_code=502)
    return data

@router.post("/abcfinancial/fetch", summary="Fetch from ABC Financial API, store in DB, and return data")
def fetch_and_store_abcfinancial_events():
    url = "https://api.abcfinancial.com/rest/40059/calendars/events?eventDateRange=2025-06-01&page=1"
    headers = {
        "Accept": "application/json;charset=UTF-8",
        "app_id": "4c9b9b55",
        "app_key": "112d217a8efeafb44fc9a7c1c34b357e"
    }
    response = requests.get(url, headers=headers)
    try:
        data = response.json()
    except Exception:
        return JSONResponse(content={"error": "Invalid JSON from ABC Financial API", "raw": response.text}, status_code=502)
    events = data if isinstance(data, list) else data.get("events") or []
    insert_abc_events(events)
    return events

@router.get("/abcfinancial/db", summary="Get all stored ABC Financial events from DB")
def get_abcfinancial_events_db():
    return get_abc_events() 