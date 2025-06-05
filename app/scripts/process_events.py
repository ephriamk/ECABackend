import csv
import sqlite3
import os
from datetime import datetime

CSV_FILE = 'events.csv'  # Path to your events CSV file
DB_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'events.db')  # backend/events.db

# Define the schema for the events table
CREATE_TABLE_SQL = '''
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_nbr TEXT,
    employee_name TEXT,
    agreement_number TEXT,
    member_name TEXT,
    event_type TEXT,
    price REAL,
    event_date TEXT,
    event_time TEXT,
    event_status TEXT,
    event_commission REAL,
    completed_datetime TEXT
);
'''

def convert_date(date_str):
    if not date_str or not date_str.strip():
        return ''
    s = date_str.strip()
    # Try MM/DD/YYYY
    try:
        dt = datetime.strptime(s, '%m/%d/%Y')
        return dt.strftime('%Y-%m-%d')
    except Exception:
        pass
    # Try YYYY-MM-DD
    try:
        dt = datetime.strptime(s, '%Y-%m-%d')
        return dt.strftime('%Y-%m-%d')
    except Exception:
        pass
    # Try MM/DD/YYYY HH:MM (for completed_datetime)
    try:
        dt = datetime.strptime(s, '%m/%d/%Y %H:%M')
        return dt.strftime('%Y-%m-%d %H:%M')
    except Exception:
        pass
    # Try YYYY-MM-DD HH:MM
    try:
        dt = datetime.strptime(s, '%Y-%m-%d %H:%M')
        return dt.strftime('%Y-%m-%d %H:%M')
    except Exception:
        pass
    return s  # fallback: return as is

def read_events_csv(csv_path):
    events = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convert event_date and completed_datetime
            event_date = convert_date(row.get('Event Date', ''))
            completed_datetime = convert_date(row.get('Completed Date/Time', ''))
            
            # Parse price and commission as float
            try:
                price = float(row.get('Price', 0) or 0)
            except:
                price = 0.0
            
            try:
                commission = float(row.get('Event Commission', 0) or 0)
            except:
                commission = 0.0
            
            events.append({
                'club_nbr': row.get('Club Nbr', ''),
                'employee_name': row.get('Employee Name (last, first)', ''),
                'agreement_number': row.get('Agreement #', ''),
                'member_name': row.get('Member Name', ''),
                'event_type': row.get('Event Type', ''),
                'price': price,
                'event_date': event_date,
                'event_time': row.get('Event Time', ''),
                'event_status': row.get('Event Status', ''),
                'event_commission': commission,
                'completed_datetime': completed_datetime,
            })
    return events

def main():
    # Create DB and table if not exists
    conn = sqlite3.connect(DB_FILE)
    cur = conn.cursor()
    cur.execute(CREATE_TABLE_SQL)
    conn.commit()

    # Clear existing data (optional, for re-import)
    cur.execute('DELETE FROM events')
    conn.commit()

    events = read_events_csv(CSV_FILE)
    
    # Insert events
    for event in events:
        cur.execute('''
            INSERT INTO events (club_nbr, employee_name, agreement_number, member_name, 
                              event_type, price, event_date, event_time, event_status, 
                              event_commission, completed_datetime)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event['club_nbr'], event['employee_name'], event['agreement_number'],
            event['member_name'], event['event_type'], event['price'],
            event['event_date'], event['event_time'], event['event_status'],
            event['event_commission'], event['completed_datetime']
        ))
    
    conn.commit()
    print(f"Inserted {len(events)} rows into events.db.")
    conn.close()

if __name__ == '__main__':
    main() 