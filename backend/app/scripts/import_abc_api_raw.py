import json
import sqlite3
import os
import requests

API_URL = "https://api.abcfinancial.com/rest/40059/clubs/transactions/pos"
APP_ID = "4c9b9b55"
APP_KEY = "112d217a8efeafb44fc9a7c1c34b357e"
TRANSACTION_TIMESTAMP_RANGE = "2025-06-01 00:00:00.000000"  # Fetch from the start of June 2025
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../sales_data_api.db"))
TABLE_NAME = "api_transactions_raw"
ABC_API_JSON = os.path.join(os.path.dirname(__file__), "abc_api_sample.json")

USE_LOCAL_FILE = False  # Set to True to use the local JSON file instead of the API

def fetch_transactions_from_api():
    all_transactions = []
    page = 1
    total_pages = 0
    while True:
        params = {
            "transactionTimestampRange": TRANSACTION_TIMESTAMP_RANGE,
            "page": page
        }
        headers = {
            "Accept": "application/json;charset=UTF-8",
            "app_id": APP_ID,
            "app_key": APP_KEY
        }
        print(f"Fetching page {page}...")
        resp = requests.get(API_URL, headers=headers, params=params)
        print(f"Status code: {resp.status_code}")
        try:
            data = resp.json()
        except Exception as e:
            print(f"Error decoding JSON on page {page}: {e}\nRaw response: {resp.text[:500]}")
            break
        clubs = data.get("clubs", [])
        transactions = []
        for club in clubs:
            transactions.extend(club.get("transactions", []))
        print(f"  -> Got {len(transactions)} transactions on page {page}")
        if not transactions:
            print(f"No transactions found on page {page}, stopping.")
            break
        all_transactions.extend(transactions)
        page += 1
        total_pages += 1
    print(f"Fetched {total_pages} pages in total.")
    return all_transactions

def fetch_transactions_from_file():
    with open(ABC_API_JSON, "r") as f:
        data = json.load(f)
    transactions = []
    for club in data.get("clubs", []):
        for tx in club.get("transactions", []):
            transactions.append(tx)
    return transactions

def store_transactions(transactions):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(f"""
    CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT,
        raw_json TEXT
    )
    """)
    for tx in transactions:
        tx_id = tx.get("transactionId")
        c.execute(f"INSERT INTO {TABLE_NAME} (transaction_id, raw_json) VALUES (?, ?)", (tx_id, json.dumps(tx)))
    conn.commit()
    conn.close()
    print(f"Inserted {len(transactions)} transactions into {TABLE_NAME}.")

if __name__ == "__main__":
    if USE_LOCAL_FILE:
        txs = fetch_transactions_from_file()
    else:
        txs = fetch_transactions_from_api()
    store_transactions(txs) 