from fastapi import APIRouter
from typing import List, Dict, Any
import sqlite3
import string
from app.db import DB_PATH, MEMBERSHIPS_DB_PATH

router = APIRouter(prefix="/api/sales", tags=["eft"])

UPGRADE_ITEMS = [
    'UPG to AMT+',
    'CT UPGRADE',
    'UPG CTG',
    'Upg to AMT',
    'CT - Upgrade'
]

def normalize_plan(plan):
    if not plan:
        return ''
    # Lowercase, strip whitespace, remove trailing punctuation (periods, etc.)
    plan = plan.strip().lower()
    plan = plan.rstrip(string.punctuation + ' ')
    return plan

@router.get("/eft-entries", response_model=List[Dict[str, Any]])
def get_eft_entries():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(f"ATTACH DATABASE '{MEMBERSHIPS_DB_PATH}' AS mdb")
    sales = conn.execute("""
        SELECT
            s.sale_id,
            s.member_name,
            s.profit_center,
            s.commission_employees,
            s.sales_person,
            s.latest_payment_date,
            s.agreement_payment_plan,
            s.main_item,
            s.total_amount
        FROM sales AS s
    """).fetchall()
    memberships = conn.execute("SELECT membership_type, price FROM mdb.memberships").fetchall()
    conn.close()

    # Build membership lookup (normalized)
    membership_lookup = {normalize_plan(m['membership_type']): m['price'] for m in memberships}

    def get_price(plan):
        if not plan:
            return 0.0
        return membership_lookup.get(normalize_plan(plan), 0.0)

    results = []
    for s in sales:
        pc = (s['profit_center'] or '').strip()
        main_item = (s['main_item'] or '').strip() if s['main_item'] else ''
        plan = (s['agreement_payment_plan'] or '').strip() if s['agreement_payment_plan'] else ''
        price = 0.0
        if pc == 'New Business':
            price = get_price(plan)
        elif pc == 'Promotion' and any(main_item.lower() == upg.lower() for upg in UPGRADE_ITEMS):
            price = s['total_amount'] / 2 if s['total_amount'] else 0.0
        else:
            continue
        results.append({
            'sale_id': s['sale_id'],
            'member_name': s['member_name'],
            'profit_center': pc,
            'commission_employees': s['commission_employees'],
            'sales_person': s['sales_person'],
            'latest_payment_date': s['latest_payment_date'],
            'agreement_payment_plan': plan,
            'main_item': main_item,
            'price': price
        })
    return results
