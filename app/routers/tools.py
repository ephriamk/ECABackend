from fastapi import APIRouter
from app.scripts import process_guests  # ✅ correct import

router = APIRouter(prefix="/api/tools", tags=["tools"])

@router.post("/process-guests")
def run_guest_processor():
    return process_guests.run()
