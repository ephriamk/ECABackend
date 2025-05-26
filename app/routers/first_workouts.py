# app/routers/first_workouts.py

from fastapi import APIRouter
from datetime import datetime, timedelta
import sqlite3
import os
from typing import Dict, List, Set, Tuple

router = APIRouter(prefix="/api/first-workouts", tags=["first-workouts"])

def normalize_name(name: str) -> str:
    """Normalize a name for matching purposes"""
    if not name:
        return ""
    
    # Remove extra spaces and strip
    name = ' '.join(name.split())
    
    # Handle "Last, First" format
    if "," in name:
        parts = name.split(",", 1)
        last = parts[0].strip()
        first = parts[1].strip() if len(parts) > 1 else ""
        return f"{first} {last}".lower()
    
    return name.lower()

def get_sales_staff_mapping() -> Dict[str, str]:
    """Get a mapping of normalized names to original sales staff names"""
    try:
        from app.db import query_employees
        # Try with capitalized column names first (Name, Position)
        try:
            sales_staff_rows = query_employees("SELECT Name, Position FROM employees WHERE Position LIKE 'Sales%'")
            name_field = 'Name'
        except:
            # Fallback to lowercase
            sales_staff_rows = query_employees("SELECT name, position FROM employees WHERE position LIKE 'Sales%'")
            name_field = 'name'
        
        # Create a mapping of normalized names to original names
        mapping = {}
        for row in sales_staff_rows:
            if row.get(name_field):
                original = row[name_field].strip()
                normalized = normalize_name(original)
                mapping[normalized] = original
                
                # Also add individual words as keys for partial matching
                words = normalized.split()
                for word in words:
                    if len(word) > 2:  # Skip short words like "jr", "de", etc.
                        if word not in mapping:
                            mapping[word] = original
        
        print(f"Sales staff mapping: {mapping}")
        return mapping
    except Exception as e:
        print(f"Error getting sales staff: {e}")
        return {}

def match_to_sales_staff(employee_name: str, sales_mapping: Dict[str, str]) -> str:
    """
    Match an employee name to a sales staff member.
    Returns the original sales staff name if matched, or None if not.
    """
    if not employee_name:
        return None
    
    # Normalize the employee name (removes extra spaces)
    normalized_emp = normalize_name(employee_name)
    
    # Check for exact match
    if normalized_emp in sales_mapping:
        return sales_mapping[normalized_emp]
    
    # Split into words for partial matching
    emp_words = normalized_emp.split()
    
    # Check if any word matches a key in the mapping
    for word in emp_words:
        if len(word) > 2 and word in sales_mapping:
            return sales_mapping[word]
    
    # Check for partial matches - if the employee name contains or is contained in a sales staff name
    for sales_key, sales_original in sales_mapping.items():
        # Skip single word keys for this check to avoid false positives
        if ' ' in sales_key:
            if normalized_emp in sales_key or sales_key in normalized_emp:
                return sales_original
    
    # Last resort: check if first or last name matches
    if len(emp_words) >= 2:
        # Try matching just first name or just last name
        first_name = emp_words[0]
        last_name = emp_words[-1]
        
        for sales_key, sales_original in sales_mapping.items():
            sales_words = sales_key.split()
            if len(sales_words) >= 2:
                if (first_name == sales_words[0] or last_name == sales_words[-1]):
                    return sales_original
    
    return None

@router.get("/counts")
def get_workout_counts():
    """Get first workout counts"""
    try:
        # Get dates
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        first_of_month = today.replace(day=1)
        
        print(f"Checking dates: today={today}, yesterday={yesterday}, first_of_month={first_of_month}")
        
        # Connect to database
        db_path = "firstWorkouts.db"
        if not os.path.exists(db_path):
            return {}
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # Get all completed workouts
        cur.execute("""
            SELECT Employee, [Event Date], [Event Status]
            FROM [first_workouts]
            WHERE [Event Status] = 'Completed'
        """)
        
        rows = cur.fetchall()
        conn.close()
        
        print(f"Found {len(rows)} total completed workouts")
        
        # Get sales staff mapping
        sales_mapping = get_sales_staff_mapping()
        
        # Debug: Print some employee names to see what we're working with
        sample_employees = []
        for i, row in enumerate(rows[:10]):  # First 10 for debugging
            if row['Employee']:
                sample_employees.append(row['Employee'])
        print(f"Sample employee names from workouts: {sample_employees}")
        
        # Count workouts by employee
        raw_counts = {}
        unmatched_employees = set()  # Track unmatched for debugging
        matched_count = 0
        
        for row in rows:
            employee_raw = row['Employee'] if row['Employee'] else ''
            event_date_str = row['Event Date']
            
            if not event_date_str:
                continue
            
            # Parse date
            try:
                event_date = datetime.strptime(event_date_str, '%m/%d/%Y').date()
            except:
                print(f"Could not parse date: {event_date_str}")
                continue
            
            # Filter by month
            if event_date < first_of_month:
                continue
            
            # Match employee to sales staff
            matched_staff = match_to_sales_staff(employee_raw, sales_mapping)
            
            if matched_staff:
                employee_key = matched_staff
                matched_count += 1
                print(f"Matched '{employee_raw}' -> '{matched_staff}'")
            else:
                employee_key = 'Other'
                if employee_raw:
                    unmatched_employees.add(employee_raw)
            
            # Initialize employee if not exists
            if employee_key not in raw_counts:
                raw_counts[employee_key] = {'today': 0, 'mtd': 0}
            
            # Count MTD
            raw_counts[employee_key]['mtd'] += 1
            
            # Count today (yesterday)
            if event_date == yesterday:
                raw_counts[employee_key]['today'] += 1
        
        # Convert the counts to use normalized "First Last" format for frontend compatibility
        counts = {}
        for key, value in raw_counts.items():
            if key == 'Other':
                normalized_key = 'Other'
            else:
                # Convert "Last, First" to "First Last"
                if ',' in key:
                    parts = key.split(',', 1)
                    last = parts[0].strip()
                    first = parts[1].strip() if len(parts) > 1 else ""
                    normalized_key = f"{first} {last}"
                else:
                    normalized_key = key
            counts[normalized_key] = value
        
        print(f"Total matched to sales staff: {matched_count}")
        print(f"Unmatched employees (going to Other): {list(unmatched_employees)[:10]}")  # First 10
        print(f"Final counts: {counts}")
        return counts
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return {}

@router.get("/details/{employee}/{period}")
def get_workout_details(employee: str, period: str):
    """Get detailed first workout entries for a specific employee and period"""
    try:
        if period not in ['today', 'mtd']:
            return {'error': 'Period must be "today" or "mtd"'}
        
        # Get dates
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        first_of_month = today.replace(day=1)
        
        # Connect to database
        db_path = "firstWorkouts.db"
        if not os.path.exists(db_path):
            return {'details': []}
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        # Get all completed workouts with all needed fields
        cur.execute("""
            SELECT rowid, [Agreement #], [Member Name (last, first)], Employee, [Event Date], [Event Status]
            FROM [first_workouts]
            WHERE [Event Status] = 'Completed'
        """)
        
        rows = cur.fetchall()
        conn.close()
        
        # Get sales staff mapping
        sales_mapping = get_sales_staff_mapping()
        
        # Filter and process results
        results = []
        
        for row in rows:
            emp_raw = row['Employee'] if row['Employee'] else ''
            member = row['Member Name (last, first)'] if row['Member Name (last, first)'] else 'Unknown'
            event_date_str = row['Event Date']
            agreement_num = row['Agreement #'] if row['Agreement #'] else ''
            rowid = row['rowid']
            
            if not event_date_str:
                continue
            
            # Parse date
            try:
                event_date = datetime.strptime(event_date_str, '%m/%d/%Y').date()
            except:
                continue
            
            # Filter by period
            if period == 'today' and event_date != yesterday:
                continue
            elif period == 'mtd' and event_date < first_of_month:
                continue
            
            # Match employee
            matched_staff = match_to_sales_staff(emp_raw, sales_mapping)
            
            # Normalize the matched staff name to "First Last" format for comparison
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
            
            # Check if this matches the requested employee
            if employee == "Other" and matched_staff is None:
                results.append({
                    'workout_id': str(rowid),
                    'employee': emp_raw,  # Show original name
                    'member_name': member,
                    'event_date': event_date_str,
                    'agreement_number': agreement_num
                })
            elif employee != "Other" and normalized_matched and employee.lower() == normalized_matched.lower():
                results.append({
                    'workout_id': str(rowid),
                    'employee': emp_raw,  # Show original name
                    'member_name': member,
                    'event_date': event_date_str,
                    'agreement_number': agreement_num
                })
        
        return {'details': results}
        
    except Exception as e:
        print(f"Error getting workout details: {e}")
        import traceback
        traceback.print_exc()
        return {'details': []}

@router.get("/debug/sales-staff")
def debug_sales_staff():
    """Debug endpoint to see sales staff"""
    try:
        from app.db import query_employees
        # Try with capitalized column names
        try:
            sales_staff_rows = query_employees("SELECT Name, Position FROM employees WHERE Position LIKE 'Sales%'")
            return {'sales_staff': [{'name': row['Name'], 'position': row['Position']} for row in sales_staff_rows]}
        except:
            # Fallback to lowercase
            sales_staff_rows = query_employees("SELECT name, position FROM employees WHERE position LIKE 'Sales%'")
            return {'sales_staff': [{'name': row['name'], 'position': row['position']} for row in sales_staff_rows]}
    except Exception as e:
        return {'error': str(e)}

@router.get("/debug/matching")
def debug_matching():
    """Debug endpoint to test name matching"""
    try:
        # Get sales mapping
        sales_mapping = get_sales_staff_mapping()
        
        # Also get raw sales staff for debugging
        from app.db import query_employees
        try:
            sales_staff_rows = query_employees("SELECT Name, Position FROM employees WHERE Position LIKE 'Sales%'")
            sales_staff_list = [{'name': row['Name'], 'position': row['Position']} for row in sales_staff_rows]
        except:
            sales_staff_list = []
        
        # Get some workout employees
        db_path = "firstWorkouts.db"
        if not os.path.exists(db_path):
            return {'error': 'Database not found'}
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        
        cur.execute("""
            SELECT DISTINCT Employee
            FROM [first_workouts]
            WHERE Employee IS NOT NULL AND Employee != ''
            LIMIT 20
        """)
        
        workout_employees = [row['Employee'] for row in cur.fetchall()]
        conn.close()
        
        # Test matching
        matches = []
        for emp in workout_employees:
            matched = match_to_sales_staff(emp, sales_mapping)
            matches.append({
                'workout_employee': emp,
                'normalized': normalize_name(emp),
                'matched_to': matched or 'Other'
            })
        
        return {
            'sales_staff': sales_staff_list,
            'sales_mapping_keys': list(sales_mapping.keys())[:20],  # First 20 keys
            'test_matches': matches
        }
        
    except Exception as e:
        import traceback
        return {'error': str(e), 'traceback': traceback.format_exc()}

@router.put("/reassign-workout")
def reassign_workout(workout_data: dict):
    """Reassign workout to different employee"""
    try:
        workout_id = workout_data.get('workout_id')
        new_employee = workout_data.get('new_employee')
        
        if not workout_id or not new_employee:
            return {'success': False, 'error': 'workout_id and new_employee are required'}
        
        # Connect to database
        db_path = "firstWorkouts.db"
        if not os.path.exists(db_path):
            return {'success': False, 'error': 'Database not found'}
        
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Update the employee
        cur.execute("""
            UPDATE [first_workouts]
            SET Employee = ?
            WHERE rowid = ?
        """, (new_employee, int(workout_id)))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': f'Workout reassigned to {new_employee}'}
        
    except Exception as e:
        return {'success': False, 'error': str(e)}