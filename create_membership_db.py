import sqlite3
import pandas as pd
import re
from difflib import get_close_matches

# put PIF categories first to ensure they take precedence
PIF_CATEGORIES = [
    "PIF Access",
    "PIF Amenities",
    "PIF Champions"
]

BASE_CATEGORIES = [
    "Access",
    "Amenities",
    "Champions"
]

ALL_CATEGORIES = PIF_CATEGORIES + BASE_CATEGORIES

def normalize(text: str) -> str:
    """Lowercase, remove non-alphanumerics, collapse whitespace."""
    txt = text.lower()
    txt = re.sub(r'[^a-z0-9\s]', ' ', txt)
    txt = re.sub(r'\s+', ' ', txt).strip()
    return txt

def map_other_name(plan: str) -> str:
    """Bucket a plan string into one of the six categories."""
    plan_norm = normalize(plan)
    # 1) try PIF buckets first
    for cat in PIF_CATEGORIES:
        cat_norm = normalize(cat)
        if all(word in plan_norm for word in cat_norm.split()):
            return cat
    # 2) then non-PIF buckets
    for cat in BASE_CATEGORIES:
        cat_norm = normalize(cat)
        if all(word in plan_norm for word in cat_norm.split()):
            return cat
    # 3) fallback fuzzy match against all
    cats_norm = [normalize(c) for c in ALL_CATEGORIES]
    match = get_close_matches(plan_norm, cats_norm, n=1, cutoff=0.3)
    if match:
        idx = cats_norm.index(match[0])
        return ALL_CATEGORIES[idx]
    # 4) no match
    return ""

def init_db(csv_path: str = "all_sales_report.csv",
            db_path: str = "memberships.db"):
    # load unique plans
    df = pd.read_csv(csv_path)
    plans = pd.unique(df["Agreement Payment Plan"].dropna())

    # create table
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS memberships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            membership_type TEXT NOT NULL,
            price REAL NOT NULL DEFAULT 0.0,
            other_names TEXT NOT NULL
        )
    """)
    # seed rows
    for plan in plans:
        other = map_other_name(plan)
        c.execute("""
            INSERT INTO memberships (membership_type, price, other_names)
            VALUES (?, ?, ?)
        """, (plan, 0.0, other))
    conn.commit()
    conn.close()
    print(f"✅ {db_path} initialized with {len(plans)} plans.")

if __name__ == "__main__":
    init_db()
