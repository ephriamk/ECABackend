#!/usr/bin/env python3
"""
create_thirtydayreprograms_db.py

Reads the `thirtydayreprograms.csv` in the current directory and creates
SQLite database `thirtydayreprograms.db` with a table `thirtyday_reprograms`
containing all the CSV data.
"""

import os
import sqlite3
import pandas as pd

CSV_PATH = "thirtydayreprograms.csv"
DB_PATH = "thirtydayreprograms.db"
TABLE_NAME = "thirtyday_reprograms"

def create_thirtydayreprograms_db(csv_path: str = CSV_PATH, db_path: str = DB_PATH):
    # Ensure CSV exists
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    # If DB exists, remove it to start fresh
    if os.path.exists(db_path):
        print(f"Removing existing database: {db_path}")
        os.remove(db_path)

    # Read CSV into DataFrame
    print(f"Reading CSV data from: {csv_path}")
    df = pd.read_csv(csv_path)

    # Connect to (new) SQLite database
    print(f"Creating new SQLite database: {db_path}")
    conn = sqlite3.connect(db_path)

    # Write DataFrame to SQL table
    print(f"Writing data to table `{TABLE_NAME}`...")
    df.to_sql(TABLE_NAME, conn, if_exists="replace", index=False)

    conn.commit()
    conn.close()
    print("Database creation complete.")

if __name__ == "__main__":
    create_thirtydayreprograms_db() 