# Ephriam run this script to update the employees table

#!/usr/bin/env python3
import os
import sys
import pandas as pd
import sqlite3

CSV_FILE = "employees.csv"
DB_FILE  = "employees.db"
TABLE    = "employees"

def main():
    # 1. Check for the CSV
    if not os.path.exists(CSV_FILE):
        print(f"❌ Cannot find {CSV_FILE} in {os.getcwd()}")
        sys.exit(1)

    # 2. Load it into a DataFrame
    df = pd.read_csv(CSV_FILE)

    # 3. (Re)connect to SQLite and create the table if needed
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE} (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT NOT NULL,
            profit_center TEXT,
            position      TEXT
        );
    """)

    # 4. Replace the contents of the table with the CSV data
    #    (if you want to append instead, change if_exists='replace' → 'append')
    df.to_sql(TABLE, conn, if_exists='replace', index=False)

    conn.commit()
    conn.close()

    print(f"✅ {TABLE!r} table in {DB_FILE!r} updated with {len(df)} rows from {CSV_FILE!r}")

if __name__ == "__main__":
    main()
