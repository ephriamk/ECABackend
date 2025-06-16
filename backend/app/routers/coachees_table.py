from fastapi import APIRouter, Query
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Dict
import re
from app.db import DB_PATH, query_employees

router = APIRouter(prefix="/api/coachees-table", tags=["coachees-table"])

PT_NEW_CENTERS = [
    'PT Postdate - New',
    'Personal Training - NEW',
]
PT_RENEW_CENTERS = [
    'PT Postdate - Renew',
    'Personal Training - RENEW',
]

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

def get_yesterday_and_first_of_month():
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    first_of_month = today.replace(day=1)
    return yesterday, first_of_month

def canonicalize(raw: str, official: list) -> str:
    n = normalize_name(raw)
    if not n:
        return ''
    direct_match = next((o for o in official if o.lower() == n.lower()), None)
    if direct_match:
        return direct_match
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

@router.get("/summary", summary="Get New PT and Renew PT totals for CoachesTable")
def get_coachees_table_summary() -> Dict[str, float]:
    if not os.path.exists(DB_PATH):
        return {}
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    yesterday, first_of_month = get_yesterday_and_first_of_month()
    # New PT
    cur.execute(
        f"""
        SELECT SUM(total_amount) as total FROM sales
        WHERE profit_center IN ({','.join(['?']*len(PT_NEW_CENTERS))})
          AND latest_payment_date = ?
        """, PT_NEW_CENTERS + [yesterday.isoformat()]
    )
    new_pt_today = cur.fetchone()["total"] or 0.0
    cur.execute(
        f"""
        SELECT SUM(total_amount) as total FROM sales
        WHERE profit_center IN ({','.join(['?']*len(PT_NEW_CENTERS))})
          AND latest_payment_date >= ?
        """, PT_NEW_CENTERS + [first_of_month.isoformat()]
    )
    new_pt_mtd = cur.fetchone()["total"] or 0.0
    # Renew PT
    cur.execute(
        f"""
        SELECT SUM(total_amount) as total FROM sales
        WHERE profit_center IN ({','.join(['?']*len(PT_RENEW_CENTERS))})
          AND latest_payment_date = ?
        """, PT_RENEW_CENTERS + [yesterday.isoformat()]
    )
    renew_pt_today = cur.fetchone()["total"] or 0.0
    cur.execute(
        f"""
        SELECT SUM(total_amount) as total FROM sales
        WHERE profit_center IN ({','.join(['?']*len(PT_RENEW_CENTERS))})
          AND latest_payment_date >= ?
        """, PT_RENEW_CENTERS + [first_of_month.isoformat()]
    )
    renew_pt_mtd = cur.fetchone()["total"] or 0.0
    conn.close()
    return {
        'new_pt_today': round(new_pt_today, 2),
        'new_pt_mtd': round(new_pt_mtd, 2),
        'renew_pt_today': round(renew_pt_today, 2),
        'renew_pt_mtd': round(renew_pt_mtd, 2),
        'total_pt_today': round(new_pt_today + renew_pt_today, 2),
        'total_pt_mtd': round(new_pt_mtd + renew_pt_mtd, 2),
    }

@router.get("/sales", summary="Get sales details for New PT, Renew PT, or Total PT")
def get_sales_details(
    type: str = Query('new', enum=['new', 'renew', 'total']),
    period: str = Query('today', enum=['today', 'mtd'])
):
    if not os.path.exists(DB_PATH):
        return []
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    yesterday, first_of_month = get_yesterday_and_first_of_month()
    if type == 'new':
        profit_centers = PT_NEW_CENTERS
    elif type == 'renew':
        profit_centers = PT_RENEW_CENTERS
    else:
        profit_centers = PT_NEW_CENTERS + PT_RENEW_CENTERS
    if period == 'today':
        date_filter = 'AND latest_payment_date = ?'
        date_val = yesterday.isoformat()
    else:
        date_filter = 'AND latest_payment_date >= ?'
        date_val = first_of_month.isoformat()
    cur.execute(
        f"""
        SELECT sale_id, member_name, total_amount, latest_payment_date, profit_center, commission_employees
        FROM sales
        WHERE profit_center IN ({','.join(['?']*len(profit_centers))})
        {date_filter}
        ORDER BY latest_payment_date DESC, sale_id DESC
        """,
        profit_centers + [date_val]
    )
    sales = [dict(row) for row in cur.fetchall()]
    # Get all trainers from employees DB
    trainer_rows = query_employees('SELECT "Name" FROM employees WHERE "Position" LIKE "%Trainer%" OR "Position" LIKE "%Fitness Director%"')
    trainer_names = [normalize_name(row['Name']) for row in trainer_rows if row.get('Name')]
    # For each sale, filter commission_employees to only trainers
    filtered_sales = []
    for sale in sales:
        raw = sale.get('commission_employees') or ''
        names = [normalize_name(n) for n in re.split(r',|;', raw) if n.strip()]
        filtered = []
        for n in names:
            canon = canonicalize(n, trainer_names)
            if canon in trainer_names:
                filtered.append(canon)
        sale['commission_employees'] = ', '.join(filtered)
        if sale['commission_employees']:
            filtered_sales.append(sale)
    conn.close()
    return filtered_sales 