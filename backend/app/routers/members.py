from fastapi import APIRouter, Query
from app.db import insert_members, get_members, get_members_paginated, search_members
import requests

router = APIRouter(prefix="/api/members", tags=["members"])

API_URL = 'https://api.abcfinancial.com/rest/40059/members'
APP_ID = '4c9b9b55'
APP_KEY = 'cdfeca15a4deee7bfe9c2962238b777c'
MEMBER_SINCE_DATE_RANGE = '2022-03-01'

@router.post("/fetch", summary="Fetch all members from ABC Financial API, store in DB, and return new members")
def fetch_and_store_members():
    page = 1
    all_new_members = []
    while True:
        full_url = f"{API_URL}?memberSinceDateRange={MEMBER_SINCE_DATE_RANGE}&page={page}"
        headers = {
            'Accept': 'application/json;charset=UTF-8',
            'app_id': APP_ID,
            'app_key': APP_KEY,
        }
        response = requests.get(full_url, headers=headers)
        data = response.json()
        members = data.get('members', [])
        if not members:
            break
        insert_members(members)
        all_new_members.extend(members)
        page += 1
    return all_new_members

@router.get("/db", summary="Get all stored members from DB")
def get_members_db():
    return get_members()

@router.get("/paginated", summary="Get paginated, filterable, sortable members from DB")
def get_members_paginated_endpoint(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=5000),
    sort_by: str = Query("memberId"),
    sort_order: str = Query("asc"),
    name: str = Query(None),
    email: str = Query(None),
    status: str = Query(None),
):
    return get_members_paginated(page, page_size, sort_by, sort_order, name, email, status)

@router.get("/search", summary="Search members by name or email, paginated")
def search_members_endpoint(
    query: str = Query(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=5000),
):
    return search_members(query, page, page_size) 