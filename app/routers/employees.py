# app/routers/employees.py
from fastapi import APIRouter, Body, HTTPException
from typing import List, Dict, Any
from app.db import query_employees, execute_employees

router = APIRouter(prefix="/api/employees", tags=["employees"])

@router.get("", response_model=List[Dict[str, Any]])
def list_sales_employees():
    return query_employees('''
        SELECT "Name" AS name, "Quota" AS quota
        FROM employees
        WHERE "Position" LIKE "Sales%"
        ORDER BY
            CASE "Position"
                WHEN 'Sales - General Manager' THEN 1
                WHEN 'Sales - Assistant General Manager' THEN 2
                WHEN 'Sales - Sales Manager' THEN 3
                WHEN 'Sales - Fitness Facilitator' THEN 4
                WHEN 'Sales - Receptionist' THEN 5
                ELSE 6
            END,
            "Name"
    ''')

@router.get("/all", response_model=List[Dict[str, Any]])
def list_all_employees():
    return query_employees('SELECT * FROM employees ORDER BY "Name"')

@router.get("/trainers", response_model=List[Dict[str, Any]])
def list_trainers():
    return query_employees('''
        SELECT "Name" AS name, "Position" AS position
        FROM employees
        WHERE "Position" LIKE "%Trainer%" 
           OR "Position" LIKE "%Fitness Director%"
        ORDER BY
            CASE 
                WHEN "Position" LIKE "%Fitness Director" AND "Position" NOT LIKE "%Weekend%" AND "Position" NOT LIKE "%Assistant%" THEN 1
                WHEN "Position" LIKE "%Weekend Fitness Director%" THEN 2
                WHEN "Position" LIKE "%Assistant Fitness Director%" THEN 3
                ELSE 4
            END,
            "Name"
    ''')

@router.post("", status_code=201)
def add_employee(data: Dict[str, Any] = Body(...)):
    # Check if Quota column exists first
    try:
        # Try with Quota
        fields = ['"Active"', '"Barcode"', '"Name"', '"Position"', '"Profit Center"', '"hired"', '"Quota"']
        placeholders = ", ".join("?" for _ in fields)
        values = [
            data.get("active", ""), 
            data.get("barcode", ""),
            data.get("name", ""),   
            data.get("position", ""),
            data.get("profitCenter",""), 
            data.get("hired",""),
            data.get("quota", 0)  # Default quota to 0
        ]
        execute_employees(f'INSERT INTO employees ({", ".join(fields)}) VALUES ({placeholders})', tuple(values))
    except Exception as e:
        if "no column named Quota" in str(e):
            # Fallback without Quota
            fields = ['"Active"', '"Barcode"', '"Name"', '"Position"', '"Profit Center"', '"hired"']
            placeholders = ", ".join("?" for _ in fields)
            values = [
                data.get("active", ""), 
                data.get("barcode", ""),
                data.get("name", ""),   
                data.get("position", ""),
                data.get("profitCenter",""), 
                data.get("hired","")
            ]
            execute_employees(f'INSERT INTO employees ({", ".join(fields)}) VALUES ({placeholders})', tuple(values))
        else:
            raise e
    return {"success": True}

@router.put("/{name}")
def update_employee(name: str, data: Dict[str, Any] = Body(...)):
    fields = ["Active","Barcode","Name","Position","Profit Center","hired","Quota"]
    updates, vals = [], []
    for f,k in zip(fields, ["active","barcode","name","position","profitCenter","hired","quota"]):
        if k in data:
            updates.append(f'"{f}" = ?')
            vals.append(data[k])
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update.")
    vals.append(name)
    execute_employees(f'UPDATE employees SET {", ".join(updates)} WHERE "Name" = ?', tuple(vals))
    return {"success": True}

@router.delete("/{name}")
def delete_employee(name: str):
    execute_employees('DELETE FROM employees WHERE "Name" = ?', (name,))
    return {"success": True}