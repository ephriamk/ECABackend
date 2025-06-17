from fastapi import APIRouter, HTTPException, Query
from app.db import insert_api_events, get_api_events, insert_structured_events, query_structured_events
from app.config import settings
import requests
from datetime import datetime, timedelta
import re
import json

router = APIRouter(prefix="/api/api-events", tags=["api-events"])

API_URL = 'https://api.abcfinancial.com/rest/40059/calendars/events'

def format_event_date_range(eventDateRange: str) -> str:
    # If already in correct format, return as is
    pattern = r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}:\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}"
    if re.fullmatch(pattern, eventDateRange):
        return eventDateRange.rstrip(',')
    # If only dates are provided, add times
    parts = eventDateRange.split(":")
    if len(parts) == 2:
        start, end = parts
        start = start.strip()
        end = end.strip()
        start_full = f"{start} 00:00:00.000000"
        end_full = f"{end} 23:59:59.999999"
        return f"{start_full}:{end_full}".rstrip(',')
    return eventDateRange.rstrip(',')

@router.post("/fetch", summary="Fetch all events from Jan to July of the current year, store in DB, and return new events")
def fetch_and_store_api_events():
    all_new_events = []
    year = datetime.now().year
    # Loop from January to July (inclusive)
    for month in range(1, 8):
        start_date = f"{year}-{month:02d}-01"
        if month < 7:
            end_date = f"{year}-{month+1:02d}-01"
        else:
            end_date = f"{year}-07-31"  # July: go to end of month
        eventDateRange = f"{start_date},{end_date}"
        page = 1
        while True:
            full_url = f"{API_URL}?eventDateRange={eventDateRange}&page={page}"
            headers = {
                'Accept': 'application/json;charset=UTF-8',
                'app_id': settings.APP_ID,
                'app_key': settings.APP_KEY,
            }
            print(f"Fetching {full_url}")
            try:
                response = requests.get(full_url, headers=headers)
            except Exception as e:
                print(f"Request error for {full_url}: {e}")
                raise HTTPException(status_code=502, detail=f"Request error: {e}")
            print(f"Raw response for {full_url}: {response.text[:500]}")
            try:
                data = response.json()
            except Exception as e:
                print(f"JSON decode error for {full_url}: {e}\nRaw response: {response.text[:500]}")
                raise HTTPException(status_code=502, detail={
                    "error": f"JSON decode error: {e}",
                    "raw_response": response.text[:500],
                    "url": full_url
                })
            events = data if isinstance(data, list) else data.get('events', [])
            print(f"  -> Got {len(events)} events for {eventDateRange} page {page}")
            if not events:
                print(f"  -> No events for {eventDateRange} page {page}, stopping.")
                break
            try:
                insert_api_events(events)
            except Exception as e:
                print(f"DB insert error for page {page}: {e}")
                raise HTTPException(status_code=500, detail=f"DB insert error: {e}")
            all_new_events.extend(events)
            page += 1
    return all_new_events

@router.get("/db", summary="Get all stored API events from DB")
def get_api_events_db(
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)")
):
    raw = get_api_events()
    # Filter by eventTimestamp if dates are provided
    if start_date or end_date:
        def in_range(event):
            ts = event.get("eventTimestamp")
            if not ts:
                return False
            date = ts[:10]
            if start_date and date < start_date:
                return False
            if end_date and date > end_date:
                return False
            return True
        filtered = [e for e in raw if in_range(e)]
    else:
        filtered = raw
    if filtered and isinstance(filtered[0], str):
        return [json.loads(e) for e in filtered]
    elif filtered and isinstance(filtered[0], dict) and 'event_json' in filtered[0]:
        return [json.loads(e['event_json']) for e in filtered]
    else:
        return filtered

@router.post("/structured-events/fetch", summary="Fetch all events from Jan to July of the current year, store in structured_events.db, and return new events")
def fetch_and_store_structured_events():
    all_new_events = []
    year = datetime.now().year
    # Loop from January to July (inclusive)
    for month in range(1, 8):
        start_date = f"{year}-{month:02d}-01"
        if month < 7:
            end_date = f"{year}-{month+1:02d}-01"
        else:
            end_date = f"{year}-07-31"  # July: go to end of month
        eventDateRange = f"{start_date},{end_date}"
        page = 1
        while True:
            full_url = f"{API_URL}?eventDateRange={eventDateRange}&page={page}"
            headers = {
                'Accept': 'application/json;charset=UTF-8',
                'app_id': settings.APP_ID,
                'app_key': settings.APP_KEY,
            }
            print(f"Fetching {full_url}")
            try:
                response = requests.get(full_url, headers=headers)
            except Exception as e:
                print(f"Request error for {full_url}: {e}")
                raise HTTPException(status_code=502, detail=f"Request error: {e}")
            print(f"Raw response for {full_url}: {response.text[:500]}")
            try:
                data = response.json()
            except Exception as e:
                print(f"JSON decode error for {full_url}: {e}\nRaw response: {response.text[:500]}")
                raise HTTPException(status_code=502, detail={
                    "error": f"JSON decode error: {e}",
                    "raw_response": response.text[:500],
                    "url": full_url
                })
            events = data if isinstance(data, list) else data.get('events', [])
            print(f"  -> Got {len(events)} events for {eventDateRange} page {page}")
            if not events:
                print(f"  -> No events for {eventDateRange} page {page}, stopping.")
                break
            try:
                insert_structured_events(events)
            except Exception as e:
                print(f"DB insert error for page {page}: {e}")
                raise HTTPException(status_code=500, detail=f"DB insert error: {e}")
            all_new_events.extend(events)
            page += 1
    return all_new_events

@router.get("/structured-events/db", summary="Get all stored structured events from DB, with optional date filtering")
def get_structured_events_db(
    start_date: str = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(None, description="End date (YYYY-MM-DD)")
):
    # Build base query
    query = "SELECT * FROM events"
    params = []
    if start_date or end_date:
        query += " WHERE 1=1"
        if start_date:
            query += " AND eventTimestamp >= ?"
            params.append(start_date)
        if end_date:
            query += " AND eventTimestamp <= ?"
            params.append(end_date)
    query += " ORDER BY eventTimestamp DESC"
    events = query_structured_events(query, tuple(params))
    # For each event, fetch its members
    for event in events:
        event_id = event.get("eventId")
        members = query_structured_events(
            "SELECT memberId, firstName, lastName FROM event_members WHERE eventId = ?",
            (event_id,)
        )
        event["members"] = members
    return events

@router.get("/monthly-completions", summary="Get total completed 1st Workouts and 30 Day Reprograms in a date range")
def get_monthly_completions(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    # Query for completed 1st Workouts
    fw_query = """
        SELECT COUNT(*) FROM events
        WHERE eventName = '1st Workout' AND status = 'Completed'
        AND eventTimestamp >= ? AND eventTimestamp <= ?
    """
    tr_query = """
        SELECT COUNT(*) FROM events
        WHERE eventName = '30 Day Reprogram' AND status = 'Completed'
        AND eventTimestamp >= ? AND eventTimestamp <= ?
    """
    fw_count = query_structured_events(fw_query, (start_date, end_date))[0]["COUNT(*)"]
    tr_count = query_structured_events(tr_query, (start_date, end_date))[0]["COUNT(*)"]
    return {
        "first_workouts_completed": fw_count,
        "thirty_day_reprograms_completed": tr_count
    } 