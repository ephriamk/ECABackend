from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import employees, sales, eft, memberships, guests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def ensure_dbs():
    # simply import db to trigger missing-file errors early
    import app.db  # noqa

app.include_router(employees.router)
app.include_router(sales.router)
app.include_router(eft.router)
app.include_router(memberships.router)
app.include_router(guests.router)
