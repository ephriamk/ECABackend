# app/routers/eft_calculations.py

from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Any
import sqlite3
import os

from ..db import query_db, query_memberships

router = APIRouter(prefix="/api/eft-calculations", tags=["eft-calculations"])

@router.get("/counts")  
def get_eft_counts():
    """EFT calculation with condensed logging and name normalization"""
    try:
        print("EFT CALCULATION START")
        
        # Step 1: Get New Business sales this month
        today = datetime.now().date()
        first_of_month = today.replace(day=1)
        yesterday = today - timedelta(days=1)
        
        sales = query_db("""
            SELECT sale_id, agreement_payment_plan, commission_employees, sales_person, latest_payment_date
            FROM sales 
            WHERE profit_center = 'New Business'
        """)
        
        # Filter by current month
        this_month_sales = []
        for sale in sales:
            payment_date_str = sale.get('latest_payment_date', '')
            if payment_date_str:
                try:
                    payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
                    if payment_date >= first_of_month:
                        this_month_sales.append({**sale, 'payment_date': payment_date})
                except:
                    pass
        
        print(f"Found {len(this_month_sales)} New Business sales this month")
        
        # Step 2: Create membership lookup (exclude PIF/Pay in Full = $0 EFT)
        memberships = query_memberships("SELECT * FROM memberships")
        membership_lookup = {}
        
        for membership in memberships:
            membership_type = membership.get('membership_type', '').strip()
            price = membership.get('price', 0)
            
            # Pay in Full / PIF = $0 EFT
            if 'pif' in membership_type.lower() or 'pay in full' in membership_type.lower():
                price = 0
            
            if membership_type:
                membership_lookup[membership_type] = float(price)
        
        print(f"Created membership lookup with {len(membership_lookup)} entries")
        
        # Helper function to normalize employee names (remove extra spaces, handle formatting)
        def normalize_employee_name(name):
            if not name:
                return ""
            # Remove extra spaces and normalize
            normalized = ' '.join(name.strip().split())
            return normalized
        
        # Step 3: Process sales and calculate EFT
        eft_totals = {}
        matched_count = 0
        unmatched_plans = set()
        
        for sale in this_month_sales:
            agreement_plan = sale.get('agreement_payment_plan', '').strip()
            commission_employees = sale.get('commission_employees', '') or sale.get('sales_person', '')
            payment_date = sale.get('payment_date')
            
            if not agreement_plan or not commission_employees:
                continue
            
            # Enhanced matching logic
            matched_price = 0
            matched_membership = None
            
            # 1. Exact match
            if agreement_plan in membership_lookup:
                matched_price = membership_lookup[agreement_plan]
                matched_membership = agreement_plan
            else:
                # 2. Case-insensitive exact match
                for membership_type, price in membership_lookup.items():
                    if agreement_plan.lower() == membership_type.lower():
                        matched_price = price
                        matched_membership = membership_type
                        break
                
                if not matched_membership:
                    # 3. Contains match (both directions)
                    agreement_lower = agreement_plan.lower()
                    for membership_type, price in membership_lookup.items():
                        membership_lower = membership_type.lower()
                        if (agreement_lower in membership_lower or 
                            membership_lower in agreement_lower):
                            matched_price = price
                            matched_membership = membership_type
                            break
                
                if not matched_membership:
                    # 4. Word-based fuzzy matching
                    agreement_words = set(agreement_plan.lower().split())
                    best_match_score = 0
                    
                    for membership_type, price in membership_lookup.items():
                        membership_words = set(membership_type.lower().split())
                        # Calculate match score based on common words
                        common_words = agreement_words.intersection(membership_words)
                        significant_words = [w for w in common_words if len(w) > 2]
                        
                        if len(significant_words) > best_match_score:
                            best_match_score = len(significant_words)
                            matched_price = price
                            matched_membership = membership_type
                    
                    # Only use fuzzy match if we found significant overlap
                    if best_match_score == 0:
                        matched_membership = None
            
            if matched_membership:
                matched_count += 1
                
                # Split among employees and normalize names
                employees = [normalize_employee_name(emp) for emp in commission_employees.split(',') if emp.strip()]
                employees = [emp for emp in employees if emp]  # Remove empty names
                
                eft_per_employee = matched_price / len(employees) if employees else 0
                
                for employee in employees:
                    if employee not in eft_totals:
                        eft_totals[employee] = {'today': 0.0, 'mtd': 0.0}
                    
                    eft_totals[employee]['mtd'] += eft_per_employee
                    if payment_date == yesterday:
                        eft_totals[employee]['today'] += eft_per_employee
            else:
                unmatched_plans.add(agreement_plan)
        
        # Round results
        for employee in eft_totals:
            eft_totals[employee]['today'] = round(eft_totals[employee]['today'], 2)
            eft_totals[employee]['mtd'] = round(eft_totals[employee]['mtd'], 2)
        
        print(f"MATCHED: {matched_count}/{len(this_month_sales)} sales")
        if unmatched_plans:
            print(f"UNMATCHED: {len(unmatched_plans)} unique plans")
        print(f"EFT TOTALS: {len(eft_totals)} employees")
        for employee, totals in list(eft_totals.items())[:5]:  # Show first 5
            print(f"  {employee}: Today=${totals['today']}, MTD=${totals['mtd']}")
        if len(eft_totals) > 5:
            print(f"  ... and {len(eft_totals) - 5} more")
        
        return eft_totals
        
    except Exception as e:
        print(f"EFT ERROR: {e}")
        return {}

@router.get("/details/{employee}/{period}")
def get_eft_details(employee: str, period: str):
    """Get detailed EFT entries for a specific employee and period"""
    try:
        if period not in ['today', 'mtd']:
            return {'details': []}
        
        # Get dates
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        first_of_month = today.replace(day=1)
        
        # Get all New Business sales with details
        sales = query_db("""
            SELECT sale_id, member_name, commission_employees, sales_person, 
                   latest_payment_date, agreement_payment_plan, total_amount
            FROM sales 
            WHERE profit_center = 'New Business'
        """)
        
        # Get membership EFT lookup
        memberships = query_memberships("SELECT * FROM memberships")
        membership_lookup = {}
        
        for membership in memberships:
            membership_type = membership.get('membership_type', '').strip()
            price = membership.get('price', 0)
            
            # Pay in Full / PIF = $0 EFT
            if 'pif' in membership_type.lower() or 'pay in full' in membership_type.lower():
                price = 0
            
            if membership_type:
                membership_lookup[membership_type] = float(price)
        
        # Helper function to normalize employee names
        def normalize_employee_name(name):
            if not name:
                return ""
            normalized = ' '.join(name.strip().split())
            return normalized
        
        # Filter and process sales
        results = []
        
        for sale in sales:
            commission_employees = sale.get('commission_employees', '') or sale.get('sales_person', '')
            payment_date_str = sale.get('latest_payment_date', '')
            agreement_payment_plan = sale.get('agreement_payment_plan', '')
            member_name = sale.get('member_name', 'Unknown')
            
            if not commission_employees or not payment_date_str:
                continue
            
            # Parse date
            try:
                payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
            except:
                continue
            
            # Filter by period
            if period == 'today' and payment_date != yesterday:
                continue
            elif period == 'mtd' and payment_date < first_of_month:
                continue
            
            # Check if this sale belongs to the requested employee
            employees = [normalize_employee_name(emp) for emp in commission_employees.split(',') if emp.strip()]
            employees = [emp for emp in employees if emp]
            
            matched = False
            if employee == "Other":
                # For "Other", check if no valid employees found
                matched = len(employees) == 0
            else:
                matched = employee in employees
            
            if not matched:
                continue
            
            # Calculate EFT amount using same matching logic as main function
            matched_price = 0
            matched_membership = None
            
            # Enhanced matching logic (same as in get_eft_counts)
            if agreement_payment_plan in membership_lookup:
                matched_price = membership_lookup[agreement_payment_plan]
                matched_membership = agreement_payment_plan
            else:
                # Case-insensitive exact match
                for membership_type, price in membership_lookup.items():
                    if agreement_payment_plan.lower() == membership_type.lower():
                        matched_price = price
                        matched_membership = membership_type
                        break
                
                if not matched_membership:
                    # Contains match (both directions)
                    agreement_lower = agreement_payment_plan.lower()
                    for membership_type, price in membership_lookup.items():
                        membership_lower = membership_type.lower()
                        if (agreement_lower in membership_lower or 
                            membership_lower in agreement_lower):
                            matched_price = price
                            matched_membership = membership_type
                            break
                
                if not matched_membership:
                    # Word-based fuzzy matching
                    agreement_words = set(agreement_payment_plan.lower().split())
                    best_match_score = 0
                    
                    for membership_type, price in membership_lookup.items():
                        membership_words = set(membership_type.lower().split())
                        common_words = agreement_words.intersection(membership_words)
                        significant_words = [w for w in common_words if len(w) > 2]
                        
                        if len(significant_words) > best_match_score:
                            best_match_score = len(significant_words)
                            matched_price = price
                            matched_membership = membership_type
                    
                    if best_match_score == 0:
                        matched_membership = None
            
            # Calculate EFT per employee
            eft_per_employee = matched_price / len(employees) if employees else matched_price
            
            results.append({
                'sale_id': sale.get('sale_id'),
                'member_name': member_name,
                'payment_date': payment_date_str,
                'agreement_payment_plan': agreement_payment_plan,
                'matched_membership': matched_membership or agreement_payment_plan,
                'eft_amount': round(eft_per_employee, 2),
                'total_sale_amount': sale.get('total_amount', 0),
                'commission_employees': commission_employees
            })
        
        return {'details': results}
        
    except Exception as e:
        print(f"Error getting EFT details: {e}")
        return {'details': []}

@router.get("/debug/membership-plans")
def debug_membership_plans():
    """Debug endpoint to see available membership payment plans and their EFT amounts"""
    try:
        memberships = query_memberships("SELECT * FROM memberships LIMIT 10")
        
        # Show sample membership data so you can tell me the correct column names
        sample_data = []
        for membership in memberships:
            sample_data.append(dict(membership))
        
        return {
            'sample_memberships': sample_data,
            'note': 'Check these samples to identify the correct column names for payment plan and EFT amount'
        }
        
    except Exception as e:
        return {'error': str(e)}

@router.get("/debug/sales-structure")
def debug_sales_structure():
    """Debug endpoint to see sales_data table structure and sample data"""
    try:
        # Get table structure
        structure = query_db("PRAGMA table_info(sales_data)")
        
        # Get sample New Business sales
        sample_sales = query_db("""
            SELECT * FROM sales_data 
            WHERE profit_center = 'New Business' 
            LIMIT 5
        """)
        
        # Get count of New Business sales
        count = query_db("SELECT COUNT(*) as count FROM sales_data WHERE profit_center = 'New Business'")
        
        return {
            'table_structure': structure,
            'sample_new_business_sales': sample_sales,
            'new_business_count': count[0]['count'] if count else 0,
            'note': 'Check if Agreement Payment Plan column exists and has data'
        }
        
    except Exception as e:
        return {'error': str(e)}

@router.get("/debug/membership-structure")
def debug_membership_structure():
    """Debug endpoint to see memberships table structure and sample data"""
    try:
        # Get table structure
        structure = query_memberships("PRAGMA table_info(memberships)")
        
        # Get sample memberships
        sample_memberships = query_memberships("SELECT * FROM memberships LIMIT 10")
        
        return {
            'table_structure': structure,
            'sample_memberships': sample_memberships,
            'note': 'Check column names for membership name and price'
        }
        
    except Exception as e:
        return {'error': str(e)}

@router.get("/debug/detailed-matching")
def debug_detailed_matching():
    """Debug the actual matching process step by step"""
    try:
        # Get current month data
        today = datetime.now().date()
        first_of_month = today.replace(day=1)
        
        # Get New Business sales
        new_business_sales = query_db("""
            SELECT sale_id, commission_employees, sales_person, latest_payment_date, 
                   agreement_payment_plan, profit_center
            FROM sales 
            WHERE profit_center = 'New Business'
            AND date(latest_payment_date) >= ?
            LIMIT 10
        """, (first_of_month,))
        
        # Get memberships
        memberships = query_memberships("SELECT * FROM memberships LIMIT 10")
        
        # Show the matching process
        debug_info = {
            'current_month': str(first_of_month),
            'new_business_sales_found': len(new_business_sales),
            'memberships_found': len(memberships),
            'sample_sales': new_business_sales[:3],
            'sample_memberships': memberships[:3],
            'matching_attempts': []
        }
        
        # Try matching first few sales
        for sale in new_business_sales[:3]:
            agreement_plan = sale.get('agreement_payment_plan', '')
            match_info = {
                'sale_id': sale.get('sale_id'),
                'agreement_payment_plan': agreement_plan,
                'commission_employees': sale.get('commission_employees'),
                'matches_found': []
            }
            
            # Try to find matches
            for membership in memberships:
                for key in ['name', 'membership_name', 'title', 'plan_name', 'id']:
                    plan_name = membership.get(key)
                    if plan_name and agreement_plan:
                        if (plan_name.lower().strip() in agreement_plan.lower().strip() or
                            agreement_plan.lower().strip() in plan_name.lower().strip()):
                            match_info['matches_found'].append({
                                'membership_key': key,
                                'membership_value': plan_name,
                                'membership_price': membership.get('price')
                            })
            
            debug_info['matching_attempts'].append(match_info)
        
        return debug_info
        
    except Exception as e:
        return {'error': str(e)}