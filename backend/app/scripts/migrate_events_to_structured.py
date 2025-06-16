import sqlite3
import json
import os

# Define paths relative to the script's location
SCRIPT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..', '..'))
OLD_DB_PATH = os.path.join(BACKEND_DIR, 'apiEvents.db')
NEW_DB_PATH = os.path.join(BACKEND_DIR, 'structured_events.db')

def migrate_events():
    """
    Migrates events from the old JSON-based storage to a new, structured relational format.
    - Reads from apiEvents.db (old format).
    - Writes to structured_events.db (new format).
    """
    if not os.path.exists(OLD_DB_PATH):
        print(f"Error: Old database not found at {OLD_DB_PATH}")
        return

    # Connect to the old and new databases
    old_conn = sqlite3.connect(OLD_DB_PATH)
    old_cursor = old_conn.cursor()

    new_conn = sqlite3.connect(NEW_DB_PATH)
    new_cursor = new_conn.cursor()

    print("Creating new structured tables in structured_events.db...")

    # Drop tables if they exist to ensure a clean migration
    new_cursor.execute('DROP TABLE IF EXISTS events')
    new_cursor.execute('DROP TABLE IF EXISTS event_members')

    # Create the new 'events' table
    new_cursor.execute('''
        CREATE TABLE events (
            eventId TEXT PRIMARY KEY,
            eventName TEXT,
            eventTimestamp TEXT,
            status TEXT,
            employeeFirstName TEXT,
            employeeLastName TEXT,
            clubId TEXT
        )
    ''')

    # Create the new 'event_members' table to link members to events
    new_cursor.execute('''
        CREATE TABLE event_members (
            event_member_id INTEGER PRIMARY KEY AUTOINCREMENT,
            eventId TEXT,
            memberId TEXT,
            firstName TEXT,
            lastName TEXT,
            FOREIGN KEY (eventId) REFERENCES events (eventId)
        )
    ''')
    print("New tables created successfully.")

    # Fetch all events from the old database
    old_cursor.execute('SELECT event_json FROM api_events')
    rows = old_cursor.fetchall()

    if not rows:
        print("No events found in the old database. Migration complete.")
        old_conn.close()
        new_conn.close()
        return
        
    print(f"Found {len(rows)} events to migrate...")

    # Process each event and insert into the new structured tables
    for row in rows:
        try:
            event_data = json.loads(row[0])
            
            # Insert into the 'events' table
            event_id = event_data.get('eventId')
            if not event_id:
                continue

            new_cursor.execute('''
                INSERT OR IGNORE INTO events (
                    eventId, eventName, eventTimestamp, status, 
                    employeeFirstName, employeeLastName, clubId
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                event_id,
                event_data.get('eventName'),
                event_data.get('eventTimestamp'),
                event_data.get('status'),
                event_data.get('employeeFirstName'),
                event_data.get('employeeLastName'),
                event_data.get('clubId')
            ))

            # Insert into the 'event_members' table
            if 'members' in event_data and isinstance(event_data['members'], list):
                for member in event_data['members']:
                    new_cursor.execute('''
                        INSERT INTO event_members (
                            eventId, memberId, firstName, lastName
                        ) VALUES (?, ?, ?, ?)
                    ''', (
                        event_id,
                        member.get('memberId'),
                        member.get('firstName'),
                        member.get('lastName')
                    ))
        except json.JSONDecodeError:
            print(f"Warning: Could not decode JSON for a row. Skipping.")
        except Exception as e:
            print(f"An error occurred while processing an event: {e}. Skipping.")


    # Commit the changes and close connections
    new_conn.commit()
    old_conn.close()
    new_conn.close()

    print("Migration complete. Data has been successfully moved to structured_events.db.")
    print("Please review the new database to ensure data integrity.")

if __name__ == '__main__':
    migrate_events() 