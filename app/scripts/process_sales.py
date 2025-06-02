"""
Sales Data Processing Tool for LangGraph Agents or FastAPI triggers

This module provides a simple function that can be called by a LangGraph agent
or triggered via an API to process sales data from a CSV file, grouping transactions
based on agreement number and profit center.
"""

import os
import sys
import pandas as pd
import sqlite3
import logging
import json
import hashlib
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("SalesProcessor")


def process_sales_data(
    csv_path: str,
    db_path: str = "sales_data.db",
    summary_path: str = "sales_summary.json",
    verbose: bool = False
) -> Dict[str, Any]:
    if verbose:
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)

    result = {
        'success': False,
        'db_path': db_path,
        'summary_path': summary_path,
        'statistics': {},
        'error': None
    }

    try:
        if not os.path.exists(csv_path):
            result['error'] = f"CSV file not found: {csv_path}"
            return result

        logger.info(f"📥 Loading CSV data from {csv_path}")
        df = pd.read_csv(csv_path)

        df['Agreement #'] = df['Agreement #'].astype(str)
        df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce')
        df['Next Due Amount'] = pd.to_numeric(df['Next Due Amount'], errors='coerce')
        df['Income (Items)'] = pd.to_numeric(df['Income (Items)'], errors='coerce')
        df['Income (Tax)'] = pd.to_numeric(df['Income (Tax)'], errors='coerce')
        df['Income (Total)'] = pd.to_numeric(df['Income (Total)'], errors='coerce')
        df['Package Qty'] = pd.to_numeric(df['Package Qty'], errors='coerce').fillna(1).astype(int)
        df['Payment Date'] = pd.to_datetime(df['Payment Date'], errors='coerce').dt.strftime('%Y-%m-%d')
        df = df.fillna('')

        # Add row index to create unique identifiers for prospect entries
        df['row_index'] = range(len(df))

        grouped_sales = {}
        for (agreement, profit_center), group in df.groupby(['Agreement #', 'Profit Center']):
            if not agreement or not profit_center:
                continue
            # Check if this is a prospect agreement (generic agreement number)
            if agreement == "40059PROSP" or "PROSP" in str(agreement).upper():
                # For prospect entries, group PT profit centers by agreement, profit_center, payment_date, and item
                PT_CENTERS = [
                    'PT Postdate - New',
                    'PT Postdate - Renew',
                    'Personal Training - NEW',
                    'Personal Training - RENEW',
                ]
                if profit_center in PT_CENTERS:
                    # Group all PT for this prospect, date, and item
                    for (payment_date, item), pt_group in group.groupby(['Payment Date', 'Item']):
                        unique_string = f"{agreement}_{profit_center}_{payment_date}_{item}"
                        unique_hash = hashlib.md5(unique_string.encode('utf-8')).hexdigest()[:8]
                        unique_key = f"{agreement}_{profit_center}_{unique_hash}"
                        grouped_sales[unique_key] = pt_group.to_dict('records')
                else:
                    for _, row in group.iterrows():
                        unique_string = f"{agreement}_{profit_center}_{row['Payment Date']}_{row['Item']}_{row['Amount']}"
                        unique_hash = hashlib.md5(unique_string.encode('utf-8')).hexdigest()[:8]
                        unique_key = f"{agreement}_{profit_center}_{unique_hash}"
                        grouped_sales[unique_key] = [row.to_dict()]
            else:
                # For regular agreements, group normally
                key = f"{agreement}_{profit_center}"
                grouped_sales[key] = group.to_dict('records')

        # Create database if it doesn't exist, but don't delete existing data
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales (
            sale_id TEXT PRIMARY KEY,
            agreement_number TEXT,
            profit_center TEXT,
            member_name TEXT,
            membership_type TEXT,
            agreement_type TEXT,
            agreement_payment_plan TEXT,
            total_amount REAL,
            transaction_count INTEGER,
            sales_person TEXT,
            commission_employees TEXT,
            payment_method TEXT,
            main_item TEXT,
            latest_payment_date TEXT
        )''')

        cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id TEXT,
            payment_date TEXT,
            item TEXT,
            amount REAL,
            campaign TEXT,
            next_due_amount REAL,
            package_qty INTEGER,
            income_items REAL,
            income_tax REAL,
            income_total REAL,
            sales_person TEXT,
            commission_employees TEXT,
            employee_name TEXT,
            payment_method TEXT
        )''')

        # Get existing sale_ids to avoid duplicates
        cursor.execute("SELECT sale_id FROM sales")
        existing_sale_ids = set(row[0] for row in cursor.fetchall())
        
        new_sales_count = 0
        new_transaction_count = 0

        for sale_id, transactions in grouped_sales.items():
            # Only process if this sale_id doesn't already exist
            if sale_id not in existing_sale_ids:
                # Extract agreement number and profit center from sale_id
                parts = sale_id.split('_')
                agreement_number = parts[0]
                profit_center = '_'.join(parts[1:-1]) if len(parts) > 2 and "PROSP" in agreement_number else '_'.join(parts[1:])
                # Deduplicate by Item: only sum the first occurrence of each unique Item
                seen_items = set()
                total_amount = 0
                for t in transactions:
                    item = t.get('Item', '')
                    amount = float(t.get('Amount', 0) or 0)
                    if item not in seen_items:
                        total_amount += amount
                        seen_items.add(item)
                transaction_count_for_sale = len(transactions)
                first = transactions[0]
                latest_date = max(t.get('Payment Date', '') for t in transactions)

                cursor.execute('''
                INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
                    sale_id, agreement_number, profit_center,
                    first.get('Member Name (last, first)', ''),
                    first.get('Membership Type', ''),
                    first.get('Agreement Type', ''),
                    first.get('Agreement Payment Plan', ''),
                    total_amount,
                    transaction_count_for_sale,
                    first.get('Agt Sales Person (last, first)', ''),
                    first.get('Commission Employees', ''),
                    first.get('Payment Method', ''),
                    "; ".join(set([t.get('Item', '') for t in transactions])),
                    latest_date
                ))
                
                new_sales_count += 1

                # Insert transactions for this new sale
                for t in transactions:
                    cursor.execute('''
                    INSERT INTO transactions (
                        sale_id, payment_date, item, amount, campaign, 
                        next_due_amount, package_qty, income_items, income_tax,
                        income_total, sales_person, commission_employees, employee_name,
                        payment_method
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
                        sale_id,
                        t.get('Payment Date', ''),
                        t.get('Item', ''),
                        float(t.get('Amount', 0) or 0),
                        t.get('Campaign', ''),
                        float(t.get('Next Due Amount', 0) or 0),
                        int(t.get('Package Qty', 1) or 1),
                        float(t.get('Income (Items)', 0) or 0),
                        float(t.get('Income (Tax)', 0) or 0),
                        float(t.get('Income (Total)', 0) or 0),
                        t.get('Agt Sales Person (last, first)', ''),
                        t.get('Commission Employees', ''),
                        t.get('Employee Name (last, first)', ''),
                        t.get('Payment Method', '')
                    ))
                    
                    new_transaction_count += 1
            else:
                logger.debug(f"Skipping existing sale_id: {sale_id}")

        conn.commit()
        conn.close()

        result['success'] = True
        result['statistics'] = {
            "total_sales_in_csv": len(grouped_sales),
            "total_transactions_in_csv": len(df),
            "new_sales_added": new_sales_count,
            "new_transactions_added": new_transaction_count,
            "existing_sales_preserved": len(grouped_sales) - new_sales_count
        }

        with open(summary_path, "w") as f:
            json.dump(result['statistics'], f, indent=2)

        if new_sales_count > 0:
            logger.info(f"✅ Added {new_sales_count} new sales and {new_transaction_count} new transactions")
        else:
            logger.info(f"✅ No new sales to add - all {len(grouped_sales)} sales already exist")
            
        logger.info(f"📊 Preserved {len(grouped_sales) - new_sales_count} existing sales with any manual edits")
        return result

    except Exception as e:
        logger.error("❌ Failed to process sales data", exc_info=True)
        result['error'] = str(e)
        return result


# ✅ Call this from FastAPI
def run() -> Dict[str, Any]:
    csv_path = os.path.join(os.path.dirname(__file__), "../../all_sales_report.csv")
    return process_sales_data(csv_path=csv_path, verbose=False)


# ✅ CLI entry point for local testing
if __name__ == "__main__":
    result = run()
    print(json.dumps(result, indent=2))