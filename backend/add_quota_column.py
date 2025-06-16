# add_quota_column.py
import sqlite3
import os

def add_quota_column():
    # Path to your employees database
    db_path = "employees.db"  # Adjust this path if needed
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if Quota column already exists
        cursor.execute("PRAGMA table_info(employees)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if "Quota" in columns:
            print("Quota column already exists!")
        else:
            # Add the Quota column
            cursor.execute('ALTER TABLE employees ADD COLUMN "Quota" REAL DEFAULT 0')
            conn.commit()
            print("Successfully added Quota column to employees table")
            
            # Optional: Set initial quota values for existing employees
            # cursor.execute('UPDATE employees SET "Quota" = 0 WHERE "Quota" IS NULL')
            # conn.commit()
        
        conn.close()
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_quota_column()