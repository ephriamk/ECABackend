from fastapi import APIRouter
from datetime import datetime, timedelta
import sqlite3
import os
from typing import Dict, List

router = APIRouter(prefix="/api/thirtyday-reprograms", tags=["thirtyday-reprograms"])

DB_PATH = "thirtydayreprograms.db"
TABLE_NAME = "thirtyday_reprograms"

# Helper: normalize name

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

# Helper: get sales staff mapping (reuse from first_workouts)

def get_sales_staff_mapping() -> Dict[str, str]:
    try:
        from app.db import query_employees
        try:
            sales_staff_rows = query_employees("SELECT Name, Position FROM employees WHERE Position LIKE 'Sales%'")
            name_field = 'Name'
        except:
            sales_staff_rows = query_employees("SELECT name, position FROM employees WHERE position LIKE 'Sales%'")
            name_field = 'name'
        mapping = {}
        for row in sales_staff_rows:
            if row.get(name_field):
                original = row[name_field].strip()
                normalized = normalize_name(original)
                mapping[normalized] = original
                words = normalized.split()
                for word in words:
                    if len(word) > 2:
                        if word not in mapping:
                            mapping[word] = original
        return mapping
    except Exception as e:
        print(f"Error getting sales staff: {e}")
        return {}

def match_to_sales_staff(employee_name: str, sales_mapping: Dict[str, str]) -> str:
    if not employee_name:
        return None
    normalized_emp = normalize_name(employee_name)
    if normalized_emp in sales_mapping:
        return sales_mapping[normalized_emp]
    emp_words = normalized_emp.split()
    for word in emp_words:
        if len(word) > 2 and word in sales_mapping:
            return sales_mapping[word]
    for sales_key, sales_original in sales_mapping.items():
        if ' ' in sales_key:
            if normalized_emp in sales_key or sales_key in normalized_emp:
                return sales_original
    if len(emp_words) >= 2:
        first_name = emp_words[0]
        last_name = emp_words[-1]
        for sales_key, sales_original in sales_mapping.items():
            sales_words = sales_key.split()
            if len(sales_words) >= 2:
                if (first_name == sales_words[0] or last_name == sales_words[-1]):
                    return sales_original
    return None

@router.get("/counts")
def get_reprogram_counts():
    try:
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        first_of_month = today.replace(day=1)
        print(f"[DEBUG] Today: {today}, Yesterday: {yesterday}, First of month: {first_of_month}")
        if not os.path.exists(DB_PATH):
            return {}
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(f"""
            SELECT Employee, [Event Date], [Event Status]
            FROM [{TABLE_NAME}]
            WHERE [Event Status] = 'Completed'
        """)
        rows = cur.fetchall()
        conn.close()
        sales_mapping = get_sales_staff_mapping()
        print(f"[DEBUG] Sales staff mapping: {sales_mapping}")
        raw_counts = {}
        for row in rows:
            employee_raw = row['Employee'] if row['Employee'] else ''
            event_date_str = row['Event Date']
            print(f"[DEBUG] Row: Employee='{employee_raw}', Event Date='{event_date_str}'")
            if not event_date_str:
                continue
            try:
                event_date = datetime.strptime(event_date_str, '%m/%d/%Y').date()
            except Exception as e:
                print(f"[DEBUG] Could not parse date: {event_date_str} ({e})")
                continue
            # if event_date < first_of_month:
            #     print(f"[DEBUG] Skipping event before first of month: {event_date}")
            #     continue
            matched_staff = match_to_sales_staff(employee_raw, sales_mapping)
            print(f"[DEBUG] Matched '{employee_raw}' to '{matched_staff}'")
            if matched_staff:
                employee_key = matched_staff
            else:
                employee_key = 'Other'
            if employee_key not in raw_counts:
                raw_counts[employee_key] = {'today': 0, 'mtd': 0}
            raw_counts[employee_key]['mtd'] += 1
            if event_date == yesterday:
                raw_counts[employee_key]['today'] += 1
        counts = {}
        for key, value in raw_counts.items():
            if key == 'Other':
                normalized_key = 'Other'
            else:
                if ',' in key:
                    parts = key.split(',', 1)
                    last = parts[0].strip()
                    first = parts[1].strip() if len(parts) > 1 else ""
                    normalized_key = f"{first} {last}"
                else:
                    normalized_key = key
            counts[normalized_key] = value
        print(f"[DEBUG] Final counts: {counts}")
        return counts
    except Exception as e:
        print(f"Error in get_reprogram_counts: {e}")
        return {}

@router.get("/details/{employee}/{period}")
def get_reprogram_details(employee: str, period: str):
    try:
        if period not in ['today', 'mtd']:
            return {'error': 'Period must be "today" or "mtd"'}
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        first_of_month = today.replace(day=1)
        if not os.path.exists(DB_PATH):
            return {'details': []}
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(f"""
            SELECT rowid, [Agreement #], [Member Name (last, first)], Employee, [Event Date], [Event Status]
            FROM [{TABLE_NAME}]
            WHERE [Event Status] = 'Completed'
        """)
        rows = cur.fetchall()
        conn.close()
        sales_mapping = get_sales_staff_mapping()
        results = []
        for row in rows:
            emp_raw = row['Employee'] if row['Employee'] else ''
            member = row['Member Name (last, first)'] if row['Member Name (last, first)'] else 'Unknown'
            event_date_str = row['Event Date']
            agreement_num = row['Agreement #'] if row['Agreement #'] else ''
            rowid = row['rowid']
            if not event_date_str:
                continue
            try:
                event_date = datetime.strptime(event_date_str, '%m/%d/%Y').date()
            except:
                continue
            # if period == 'today' and event_date != yesterday:
            #     continue
            # elif period == 'mtd' and event_date < first_of_month:
            #     continue
            matched_staff = match_to_sales_staff(emp_raw, sales_mapping)
            if matched_staff and matched_staff != 'Other':
                if ',' in matched_staff:
                    parts = matched_staff.split(',', 1)
                    last = parts[0].strip()
                    first = parts[1].strip() if len(parts) > 1 else ""
                    normalized_matched = f"{first} {last}"
                else:
                    normalized_matched = matched_staff
            else:
                normalized_matched = None
            if employee == "Other" and matched_staff is None:
                results.append({
                    'reprogram_id': str(rowid),
                    'employee': emp_raw,
                    'member_name': member,
                    'event_date': event_date_str,
                    'agreement_number': agreement_num
                })
            elif employee != "Other" and normalized_matched and employee.lower() == normalized_matched.lower():
                results.append({
                    'reprogram_id': str(rowid),
                    'employee': emp_raw,
                    'member_name': member,
                    'event_date': event_date_str,
                    'agreement_number': agreement_num
                })
        return {'details': results}
    except Exception as e:
        print(f"Error getting reprogram details: {e}")
        return {'details': []} 