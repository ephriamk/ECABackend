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

        # Handle both 'Agreement #' and 'agreement_number' columns
        if 'Agreement #' not in df.columns and 'agreement_number' in df.columns:
            df['Agreement #'] = df['agreement_number']
        elif 'Agreement #' not in df.columns and 'agreement_number' not in df.columns:
            result['error'] = "CSV must contain either 'Agreement #' or 'agreement_number' column."
            return result
        # If both exist, prefer 'Agreement #' as is

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
            latest_payment_date TEXT,
            manual_override INTEGER DEFAULT 0
        )''')

        # Try to add the column if it doesn't exist (for existing DBs)
        try:
            cursor.execute('ALTER TABLE sales ADD COLUMN manual_override INTEGER DEFAULT 0')
        except Exception:
            pass  # Ignore if already exists

        # Add audit/history table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS sales_audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id TEXT,
            action TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            old_data TEXT,
            new_data TEXT
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

        # Group by agreement, payment date, member name, and profit center for unique sales
        grouped = df.groupby(['Agreement #', 'Payment Date', 'Member Name (last, first)', 'Profit Center'])
        grouped_sales = {}
        for (agreement, payment_date, member_name, profit_center), group in grouped:
            unique_string = f"{agreement}_{payment_date}_{member_name}_{profit_center}"
            unique_hash = hashlib.md5(unique_string.encode('utf-8')).hexdigest()[:8]
            unique_key = f"{agreement}_{unique_hash}"
            grouped_sales[unique_key] = group.to_dict('records')

        # Get existing sale_ids to avoid duplicates
        cursor.execute("SELECT sale_id, profit_center, main_item FROM sales")
        existing_sales = {row[0]: {'profit_center': row[1], 'main_item': row[2]} for row in cursor.fetchall()}
        
        new_sales_count = 0
        new_transaction_count = 0

        for sale_id, transactions in grouped_sales.items():
            # Only process if this sale_id doesn't already exist
            if sale_id not in existing_sales:
                # Insert as new sale
                t = transactions[0]
                total_amount = sum(float(x.get('Amount', 0) or 0) for x in transactions)
                transaction_count_for_sale = len(transactions)
                latest_date = max(x.get('Payment Date', '') for x in transactions)
                # Use the first row for most fields, but sum amounts
                cursor.execute('''
                INSERT INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
                    sale_id, t['Agreement #'], t['Profit Center'],
                    t['Member Name (last, first)'], t['Membership Type'],
                    t['Agreement Type'], t['Agreement Payment Plan'],
                    total_amount, transaction_count_for_sale, t['Agt Sales Person (last, first)'],
                    t['Commission Employees'], t['Payment Method'],
                    "; ".join(set([x.get('Item', '') for x in transactions])),
                    latest_date, 0  # manual_override=0 for new imports
                ))
                # Insert audit row
                cursor.execute('''
                INSERT INTO sales_audit (sale_id, action, old_data, new_data) VALUES (?, ?, ?, ?)''', (
                    sale_id, 'insert', '', json.dumps(t)
                ))
                new_sales_count += 1
                # Insert all line items as transactions
                for x in transactions:
                    cursor.execute('''
                    INSERT INTO transactions (
                        sale_id, payment_date, item, amount, campaign, 
                        next_due_amount, package_qty, income_items, income_tax,
                        income_total, sales_person, commission_employees, employee_name,
                        payment_method
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
                        sale_id,
                        x.get('Payment Date', ''),
                        x.get('Item', ''),
                        float(x.get('Amount', 0) or 0),
                        x.get('Campaign', ''),
                        float(x.get('Next Due Amount', 0) or 0),
                        int(x.get('Package Qty', 1) or 1),
                        float(x.get('Income (Items)', 0) or 0),
                        float(x.get('Income (Tax)', 0) or 0),
                        float(x.get('Income (Total)', 0) or 0),
                        x.get('Agt Sales Person (last, first)', ''),
                        x.get('Commission Employees', ''),
                        x.get('Employee Name (last, first)', ''),
                        x.get('Payment Method', '')
                    ))
                    new_transaction_count += 1
            else:
                # Check if this sale is manually overridden
                cursor.execute('SELECT manual_override FROM sales WHERE sale_id=?', (sale_id,))
                row = cursor.fetchone()
                if row and row[0] == 1:
                    # Skip updating this sale from CSV
                    continue
                # Check if any tracked fields changed
                t = transactions[0]
                old = existing_sales[sale_id]
                changed = False
                changes = {}
                for field in ['profit_center', 'main_item']:
                    if t.get(field.replace('_', ' ').title(), '') != old.get(field, ''):
                        changed = True
                        changes[field] = {'old': old.get(field, ''), 'new': t.get(field.replace('_', ' ').title(), '')}
                if changed:
                    # Update sale
                    cursor.execute('''
                    UPDATE sales SET profit_center=?, main_item=? WHERE sale_id=?''', (
                        t['Profit Center'], t['Item'], sale_id
                    ))
                    # Insert audit row
                    cursor.execute('''
                    INSERT INTO sales_audit (sale_id, action, old_data, new_data) VALUES (?, ?, ?, ?)''', (
                        sale_id, 'update', json.dumps(old), json.dumps(t)
                    ))

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