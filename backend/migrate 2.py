import os
import sqlite3
import pandas as pd
from sqlalchemy import create_engine, inspect, text, Table, Column, Integer, String, MetaData
from app.config import settings

# --- Configuration ---
# This script MUST be run from the `backend` directory.
# It uses the DATABASE_URL from your .env file to connect to the production PostgreSQL DB.

# A mapping from your local SQLite DB files to the table names they contain.
# Add any other dbs/tables you need to migrate here.
SQLITE_DATABASES = {
    'members.db': ['members'],
    'structured_events.db': ['events', 'event_members'],
    'guests.db': ['guests'],
    'employees.db': ['employees'],
    # Add other DBs and their tables here if needed
}

def get_table_schema(inspector, table_name):
    """Helper to get column definitions from a live DB connection."""
    columns = []
    for col in inspector.get_columns(table_name):
        columns.append(f"{col['name']} {col['type']}")
    return columns

def migrate():
    """
    Connects to the production PostgreSQL database and local SQLite files,
    creates tables, and copies data.
    """
    if not settings.DATABASE_URL:
        print("ERROR: DATABASE_URL is not set in your .env file.")
        print("Please set it to your Render PostgreSQL Internal Connection String.")
        return

    print(f"Connecting to production database...")
    prod_engine = create_engine(settings.DATABASE_URL)
    
    with prod_engine.connect() as prod_conn:
        print("Connection successful.")
        
        for db_file, tables in SQLITE_DATABASES.items():
            db_path = os.path.join(os.path.dirname(__file__), db_file)
            if not os.path.exists(db_path):
                print(f"WARNING: SQLite file not found, skipping: {db_file}")
                continue

            print(f"--- Processing {db_file} ---")
            local_conn = sqlite3.connect(db_path)
            
            for table_name in tables:
                print(f"  Migrating table: {table_name}")
                try:
                    # Read data from SQLite into a pandas DataFrame
                    df = pd.read_sql_query(f"SELECT * FROM {table_name}", local_conn)
                    print(f"    Found {len(df)} rows in local table.")

                    # Use DataFrame's to_sql to create table and insert data
                    # 'if_exists="replace"' will DROP the table and recreate it.
                    # Use 'append' if you want to add to existing data.
                    df.to_sql(table_name, prod_conn, if_exists='replace', index=False)
                    print(f"    Successfully migrated {table_name} to production.")
                    
                except Exception as e:
                    print(f"    ERROR migrating {table_name}: {e}")
            
            local_conn.close()

    print("\n--- Migration Complete ---")

if __name__ == "__main__":
    migrate() 