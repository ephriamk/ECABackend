"""
Sales Data Processing Tool for LangGraph Agents

This module provides a simple function that can be called by a LangGraph agent
to process sales data from a CSV file, grouping transactions based on 
agreement number and profit center.

Usage in a LangGraph/LangChain agent:
   from process_sales_tool import process_sales_data
   
   # Call the function from your agent tool
   result = process_sales_data(csv_path='all_sales_report.csv', db_path='sales_data.db')
   
   # Access the returned information
   success = result['success']
   db_path = result['db_path']
   summary_path = result['summary_path']
   stats = result['statistics']
"""

import os
import sys
import pandas as pd
import sqlite3
import logging
import json
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

       logger.info(f"Loading CSV data from {csv_path}")
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

       grouped_sales = {}
       for (agreement, profit_center), group in df.groupby(['Agreement #', 'Profit Center']):
           if not agreement or not profit_center:
               continue
           key = f"{agreement}_{profit_center}"
           grouped_sales[key] = group.to_dict('records')

       if os.path.exists(db_path):
           os.remove(db_path)
           logger.info(f"Removed old database at {db_path} to apply updated schema.")

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

       for sale_id, transactions in grouped_sales.items():
           agreement_number, profit_center = sale_id.split('_', 1)
           total_amount = sum(float(t.get('Amount', 0) or 0) for t in transactions)
           transaction_count_for_sale = len(transactions)
           first = transactions[0]
           latest_date = max(t.get('Payment Date', '') for t in transactions)

           cursor.execute('''
           INSERT OR REPLACE INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', (
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

       conn.commit()
       conn.close()

       result['success'] = True
       return result

   except Exception as e:
       logger.error("Failed to process sales data", exc_info=True)
       result['error'] = str(e)
       return result

if __name__ == "__main__":
   result = process_sales_data("all_sales_report.csv", verbose=True)
   print(result)
