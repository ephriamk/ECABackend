from fastapi import APIRouter
import sqlite3
from pathlib import Path

router = APIRouter()

DB_PATH = Path(__file__).parent.parent.parent / 'attrition.db'

@router.get('/count_champions_club_cancelled')
def count_champions_club_cancelled():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT COUNT(*) FROM attrition
        WHERE membership_type = 'CHAMPIONS CLUB' AND status = 'Cancelled'
    """
    c.execute(query)
    count = c.fetchone()[0]
    conn.close()
    return {"count": count}

@router.get('/champions_club_cancelled_summary')
def champions_club_cancelled_summary():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT COUNT(*), SUM(CAST(draft AS FLOAT)) FROM attrition
        WHERE membership_type = 'CHAMPIONS CLUB' AND status = 'Cancelled'
    """
    c.execute(query)
    count, draft_sum = c.fetchone()
    conn.close()
    return {"count": count, "draft_sum": draft_sum}

@router.get('/champions_club_cancelled_details')
def champions_club_cancelled_details():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT member_name, agreement_number, status_reason, draft FROM attrition
        WHERE membership_type = 'CHAMPIONS CLUB' AND status = 'Cancelled'
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    details = [
        {
            "member_name": row[0],
            "agreement_number": str(row[1]).split('.')[0] if row[1] is not None else '',
            "status_reason": row[2],
            "draft": float(row[3]) if row[3] is not None and str(row[3]).replace('.', '', 1).replace('-', '', 1).isdigit() else row[3]
        }
        for row in rows
    ]
    return {"details": details}

@router.get('/champions_club_expired_summary')
def champions_club_expired_summary():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT COUNT(*), SUM(CAST(draft AS FLOAT)) FROM attrition
        WHERE membership_type = 'CHAMPIONS CLUB' AND status_reason = 'Expired'
    """
    c.execute(query)
    count, draft_sum = c.fetchone()
    conn.close()
    return {"count": count, "draft_sum": draft_sum}

@router.get('/champions_club_expired_details')
def champions_club_expired_details():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT member_name, agreement_number, status_reason, draft FROM attrition
        WHERE membership_type = 'CHAMPIONS CLUB' AND status_reason = 'Expired'
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    details = [
        {
            "member_name": row[0],
            "agreement_number": str(row[1]).split('.')[0] if row[1] is not None else '',
            "status_reason": row[2],
            "draft": float(row[3]) if row[3] is not None and str(row[3]).replace('.', '', 1).replace('-', '', 1).isdigit() else row[3]
        }
        for row in rows
    ]
    return {"details": details}

@router.get('/champions_club_rfc_summary')
def champions_club_rfc_summary():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT COUNT(*), SUM(CAST(draft AS FLOAT)) FROM attrition
        WHERE membership_type = 'CHAMPIONS CLUB' AND status_reason = 'Returned for collection'
    """
    c.execute(query)
    count, draft_sum = c.fetchone()
    conn.close()
    return {"count": count, "draft_sum": draft_sum}

@router.get('/champions_club_rfc_details')
def champions_club_rfc_details():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT member_name, agreement_number, status_reason, draft FROM attrition
        WHERE membership_type = 'CHAMPIONS CLUB' AND status_reason = 'Returned for collection'
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    details = [
        {
            "member_name": row[0],
            "agreement_number": str(row[1]).split('.')[0] if row[1] is not None else '',
            "status_reason": row[2],
            "draft": float(row[3]) if row[3] is not None and str(row[3]).replace('.', '', 1).replace('-', '', 1).isdigit() else row[3]
        }
        for row in rows
    ]
    return {"details": details}

@router.get('/all_other_canceled_summary')
def all_other_canceled_summary():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT COUNT(*), SUM(CAST(draft AS FLOAT)) FROM attrition
        WHERE membership_type != 'CHAMPIONS CLUB' AND status = 'Cancelled'
    """
    c.execute(query)
    count, draft_sum = c.fetchone()
    conn.close()
    return {"count": count, "draft_sum": draft_sum}

@router.get('/all_other_canceled_details')
def all_other_canceled_details():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT member_name, agreement_number, status_reason, draft FROM attrition
        WHERE membership_type != 'CHAMPIONS CLUB' AND status = 'Cancelled'
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    details = [
        {
            "member_name": row[0],
            "agreement_number": str(row[1]).split('.')[0] if row[1] is not None else '',
            "status_reason": row[2],
            "draft": float(row[3]) if row[3] is not None and str(row[3]).replace('.', '', 1).replace('-', '', 1).isdigit() else row[3]
        }
        for row in rows
    ]
    return {"details": details}

@router.get('/all_other_expired_summary')
def all_other_expired_summary():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT COUNT(*), SUM(CAST(draft AS FLOAT)) FROM attrition
        WHERE membership_type != 'CHAMPIONS CLUB' AND status = 'Expired'
    """
    c.execute(query)
    count, draft_sum = c.fetchone()
    conn.close()
    return {"count": count, "draft_sum": draft_sum}

@router.get('/all_other_expired_details')
def all_other_expired_details():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT member_name, agreement_number, status_reason, draft FROM attrition
        WHERE membership_type != 'CHAMPIONS CLUB' AND status = 'Expired'
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    details = [
        {
            "member_name": row[0],
            "agreement_number": str(row[1]).split('.')[0] if row[1] is not None else '',
            "status_reason": row[2],
            "draft": float(row[3]) if row[3] is not None and str(row[3]).replace('.', '', 1).replace('-', '', 1).isdigit() else row[3]
        }
        for row in rows
    ]
    return {"details": details}

@router.get('/all_other_rfc_summary')
def all_other_rfc_summary():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT COUNT(*), SUM(CAST(draft AS FLOAT)) FROM attrition
        WHERE membership_type != 'CHAMPIONS CLUB' AND status_reason = 'Returned for collection'
    """
    c.execute(query)
    count, draft_sum = c.fetchone()
    conn.close()
    return {"count": count, "draft_sum": draft_sum}

@router.get('/all_other_rfc_details')
def all_other_rfc_details():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    query = """
        SELECT member_name, agreement_number, status_reason, draft FROM attrition
        WHERE membership_type != 'CHAMPIONS CLUB' AND status_reason = 'Returned for collection'
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    details = [
        {
            "member_name": row[0],
            "agreement_number": str(row[1]).split('.')[0] if row[1] is not None else '',
            "status_reason": row[2],
            "draft": float(row[3]) if row[3] is not None and str(row[3]).replace('.', '', 1).replace('-', '', 1).isdigit() else row[3]
        }
        for row in rows
    ]
    return {"details": details} 