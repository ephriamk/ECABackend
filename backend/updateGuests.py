import pandas as pd
import sqlite3
import os

# Define file and database names
csv_filename = "guests.csv"
db_filename = "guests.db"

# Step 1: Read the CSV file
if not os.path.exists(csv_filename):
    raise FileNotFoundError(f"{csv_filename} not found in the current directory.")

df = pd.read_csv(csv_filename)

# Optional: Clean column names
df.columns = [col.strip().replace(" ", "_").lower() for col in df.columns]

# Step 2: Connect to SQLite database
conn = sqlite3.connect(db_filename)
cursor = conn.cursor()

# Step 3: Create the guests table
cursor.execute("""
CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    visit_type TEXT,
    source TEXT,
    created_at TEXT,
    salesperson TEXT,
    phone_mobile TEXT,
    notes TEXT
)
""")

# Step 4: Insert data
df.to_sql("guests", conn, if_exists="replace", index=False)

# Final Step: Close connection
conn.close()

print("✅ Data successfully saved to guests.db")
