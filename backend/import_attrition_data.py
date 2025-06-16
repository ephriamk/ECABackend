import pandas as pd
import sqlite3
import os

# File paths
EXCEL_FILE = 'attrition.xlsx'
DB_FILE = 'attrition.db'
TABLE_NAME = 'attrition'

# Mapping Excel headers to DB columns (snake_case)
HEADER_MAP = {
    'Club #': 'club_number',
    'Club Name': 'club_name',
    'Agreement #': 'agreement_number',
    'Member Name': 'member_name',
    'Primary Member': 'primary_member',
    'Birth Date': 'birth_date',
    'Address': 'address',
    'City': 'city',
    'State': 'state',
    'Zip Code': 'zip_code',
    'Email': 'email',
    'Phone Number': 'phone_number',
    'Membership Type': 'membership_type',
    'Status': 'status',
    'StatusReason': 'status_reason',
    'Status Date': 'status_date',
    'Gender': 'gender',
    'Age': 'age',
    'Draft': 'draft',
}

# Read Excel file
print(f"Reading {EXCEL_FILE}...")
df = pd.read_excel(EXCEL_FILE, engine='openpyxl')

# Rename columns to snake_case
print("Renaming columns...")
df = df.rename(columns=HEADER_MAP)

# Only keep columns in HEADER_MAP values
df = df[[col for col in HEADER_MAP.values() if col in df.columns]]

# Connect to SQLite DB
print(f"Connecting to {DB_FILE}...")
conn = sqlite3.connect(DB_FILE)
c = conn.cursor()

# Drop table if exists
print(f"Dropping table {TABLE_NAME} if exists...")
c.execute(f"DROP TABLE IF EXISTS {TABLE_NAME}")

# Create table
print(f"Creating table {TABLE_NAME}...")
c.execute(f'''
CREATE TABLE {TABLE_NAME} (
    club_number TEXT,
    club_name TEXT,
    agreement_number TEXT,
    member_name TEXT,
    primary_member TEXT,
    birth_date TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    email TEXT,
    phone_number TEXT,
    membership_type TEXT,
    status TEXT,
    status_reason TEXT,
    status_date TEXT,
    gender TEXT,
    age INTEGER,
    draft TEXT
)
''')

# Insert data
print(f"Inserting {len(df)} rows...")
df.to_sql(TABLE_NAME, conn, if_exists='append', index=False)

print("Done!")
conn.close() 