from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
import shutil

router = APIRouter(prefix="/api", tags=["upload"])

# Allowed CSVs and their target paths (relative to backend/)
ALLOWED_CSVS = {
    "all_sales_report.csv": "all_sales_report.csv",
    "employees.csv": "employees.csv",
    "guests.csv": "guests.csv",
    "firstWorkouts.csv": "firstWorkouts.csv",
    "thirtydayreprograms.csv": "thirtydayreprograms.csv",
    "events.csv": os.path.join("app", "scripts", "events.csv"),
}

@router.post("/upload-csv")
def upload_csv(file: UploadFile = File(...), filename: str = Form(...)):
    if filename not in ALLOWED_CSVS:
        raise HTTPException(status_code=400, detail="Invalid filename.")
    target_path = os.path.join(os.path.dirname(__file__), "..", "..", ALLOWED_CSVS[filename])
    target_path = os.path.abspath(target_path)
    # Ensure parent directory exists
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    # Save the uploaded file
    with open(target_path, "wb") as out_file:
        shutil.copyfileobj(file.file, out_file)
    return {"success": True, "filename": filename, "path": target_path} 