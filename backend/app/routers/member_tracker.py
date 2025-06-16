from fastapi import APIRouter, Query, Depends
from typing import List, Dict, Any, Optional
from app.db import get_db_session, _connect_sqlite
from app.config import settings
from sqlalchemy.orm import Session
import sqlite3
import os

router = APIRouter(
    prefix="/api/member-tracker",
    tags=["Member Tracker"],
)

def get_db_connection():
    """
    Dependency that provides a database connection.
    - For production (PostgreSQL), it yields a SQLAlchemy session.
    - For local dev (SQLite), it yields a standard sqlite3 connection with members.db attached.
    """
    if settings.DATABASE_URL:
        # Production: Use the PostgreSQL session from the connection pool
        db = next(get_db_session())
        try:
            yield db
        finally:
            db.close()
    else:
        # Local development: Use the original SQLite connection method
        db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'structured_events.db')
        members_db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'members.db')

        conn = _connect_sqlite(db_path)
        conn.execute(f"ATTACH DATABASE '{members_db_path}' AS members_db")
        try:
            yield conn
        finally:
            conn.close()

@router.get("/data", summary="Get comprehensive, paginated data for the Member Tracker")
def get_member_tracker_data(
    page: Optional[int] = Query(1, description="Page number for pagination"),
    page_size: Optional[int] = Query(25, description="Page size for pagination. Set to a very high number or 0 to fetch all."),
    sort_by: Optional[str] = Query('dateEnrolled'),
    sort_order: Optional[str] = Query('desc'),
    selected_month: Optional[str] = Query(None),
    selected_year: Optional[int] = Query(None),
    search_term: Optional[str] = Query(None),
    conn: Session = Depends(get_db_connection)
):
    """
    This high-performance endpoint drives the Member Tracker page.
    - It joins members with their events directly in the database.
    - It supports pagination, sorting, and filtering by month, year, and search term.
    """
    # Base query joining members with their various events using LEFT JOINs
    # This is the most critical part of the performance enhancement.
    query = """
    SELECT
        m.memberId,
        m.agreementNumber,
        m.primaryPhone,
        m.salesPersonName AS enrolledBy,
        m.firstName || ' ' || m.lastName AS memberName,
        m.membershipType,
        m.sinceDate AS dateEnrolled,
        
        fw_scheduled.eventTimestamp AS firstWorkoutScheduledDate,
        fw_completed.eventTimestamp AS firstWorkoutCompletedDate,
        fw_completed.employeeFirstName || ' ' || fw_completed.employeeLastName AS firstWorkoutCompletedBy,
        
        tr_scheduled.eventTimestamp AS thirtyDayReprogramScheduledDate,
        tr_completed.eventTimestamp AS thirtyDayReprogramCompletedDate,
        tr_completed.employeeFirstName || ' ' || tr_completed.employeeLastName AS thirtyDayReprogramCompletedBy,
        
        or_scheduled.eventTimestamp AS otherReprogramScheduledDate,
        or_completed.eventTimestamp AS otherReprogramCompletedDate,
        or_completed.employeeFirstName || ' ' || or_completed.employeeLastName AS otherReprogramCompletedBy

    FROM members AS m
    
    -- Join for 1st Workout (Scheduled)
    LEFT JOIN (
        SELECT em.memberId, MIN(e.eventTimestamp) as eventTimestamp
        FROM event_members em JOIN events e ON em.eventId = e.eventId
        WHERE e.eventName = '1st Workout'
        GROUP BY em.memberId
    ) AS fw_scheduled ON m.memberId = fw_scheduled.memberId
    
    -- Join for 1st Workout (Completed)
    LEFT JOIN (
        SELECT em.memberId, e.eventTimestamp, e.employeeFirstName, e.employeeLastName
        FROM event_members em JOIN events e ON em.eventId = e.eventId
        WHERE e.eventName = '1st Workout' AND e.status = 'Completed'
    ) AS fw_completed ON m.memberId = fw_completed.memberId

    -- Join for 30 Day Reprogram (Scheduled)
    LEFT JOIN (
        SELECT em.memberId, MIN(e.eventTimestamp) as eventTimestamp
        FROM event_members em JOIN events e ON em.eventId = e.eventId
        WHERE e.eventName = '30 Day Reprogram'
        GROUP BY em.memberId
    ) AS tr_scheduled ON m.memberId = tr_scheduled.memberId
    
    -- Join for 30 Day Reprogram (Completed)
    LEFT JOIN (
        SELECT em.memberId, e.eventTimestamp, e.employeeFirstName, e.employeeLastName
        FROM event_members em JOIN events e ON em.eventId = e.eventId
        WHERE e.eventName = '30 Day Reprogram' AND e.status = 'Completed'
    ) AS tr_completed ON m.memberId = tr_completed.memberId

    -- Join for Other Reprogram (Scheduled)
    LEFT JOIN (
        SELECT em.memberId, MIN(e.eventTimestamp) as eventTimestamp
        FROM event_members em JOIN events e ON em.eventId = e.eventId
        WHERE e.eventName = 'Other Reprogram'
        GROUP BY em.memberId
    ) AS or_scheduled ON m.memberId = or_scheduled.memberId
    
    -- Join for Other Reprogram (Completed)
    LEFT JOIN (
        SELECT em.memberId, e.eventTimestamp, e.employeeFirstName, e.employeeLastName
        FROM event_members em JOIN events e ON em.eventId = e.eventId
        WHERE e.eventName = 'Other Reprogram' AND e.status = 'Completed'
    ) AS or_completed ON m.memberId = or_completed.memberId
    """

    # --- Filtering Logic ---
    filters = []
    params = {}
    
    # Month and Year filtering based on dateEnrolled (sinceDate)
    months_map = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' }
    
    if selected_year:
        if selected_month and selected_month != 'All' and selected_month in months_map:
            # Filter by specific month and year
            filters.append("strftime('%m', m.sinceDate) = :month AND strftime('%Y', m.sinceDate) = :year")
            params['month'] = months_map[selected_month]
            params['year'] = str(selected_year)
        else:
            # Filter by year only (when "All" months is selected)
            filters.append("strftime('%Y', m.sinceDate) = :year")
            params['year'] = str(selected_year)

    # Exclude membershipType = 'Prospect'
    filters.append("(m.membershipType IS NULL OR m.membershipType != 'Prospect')")

    # Search term filtering
    if search_term:
        filters.append("(m.firstName LIKE :search OR m.lastName LIKE :search OR m.agreementNumber LIKE :search OR m.primaryPhone LIKE :search)")
        params['search'] = f"%{search_term}%"

    if filters:
        query += " WHERE " + " AND ".join(filters)

    # --- Sorting Logic ---
    # Define a whitelist of valid sortable columns to prevent SQL injection
    valid_sort_columns = {
        'dateEnrolled', 'memberName', 'firstWorkoutScheduledDate', 'firstWorkoutCompletedDate',
        'thirtyDayReprogramScheduledDate', 'thirtyDayReprogramCompletedDate',
        'otherReprogramScheduledDate', 'otherReprogramCompletedDate', 'enrolledBy',
        'firstWorkoutCompletedBy', 'thirtyDayReprogramCompletedBy'
    }
    if sort_by in valid_sort_columns:
        order = 'DESC' if sort_order == 'desc' else 'ASC'
        query += f" ORDER BY {sort_by} {order}"
    else:
        query += " ORDER BY dateEnrolled DESC" # Default sort

    # --- Pagination ---
    if page and page_size and page_size > 0:
        offset = (page - 1) * page_size
        query += " LIMIT :page_size OFFSET :offset"
        params['page_size'] = page_size
        params['offset'] = offset

    # Execute main query
    cursor = conn.execute(query, params)
    rows = [dict(row) for row in cursor.fetchall()]

    # --- Total Count Query (for pagination) ---
    count_query = "SELECT COUNT(m.memberId) FROM members AS m"
    if filters:
        # We must remove the parameter bindings that are not used in the count query
        count_params = {k: v for k, v in params.items() if k not in ['page_size', 'offset']}
        count_query += " WHERE " + " AND ".join(filters)
        cursor.execute(count_query, count_params)
    else:
        cursor.execute(count_query)
        
    total_records = cursor.fetchone()[0]
    
    return {"data": rows, "total": total_records} 