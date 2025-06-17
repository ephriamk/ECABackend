from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import employees, sales, eft, memberships, guests, kpi, first_workouts, tools, eft_calculations, thirtyday_reprograms, events, upload
from app.routers import attrition
from app.routers import coachees_table
from app.routers import members
from app.routers import api_events
from app.routers import member_tracker
from app.routers import transactions_api


app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def ensure_dbs():
    # import app.db so missing-file errors happen right away
    import app.db  # noqa

# register all routers
app.include_router(employees.router)
app.include_router(sales.router)
app.include_router(eft.router)
app.include_router(memberships.router)
app.include_router(guests.router)
app.include_router(kpi.router)     # ← make sure KPI router is included
app.include_router(first_workouts.router)
app.include_router(tools.router)
app.include_router(eft_calculations.router)
app.include_router(thirtyday_reprograms.router)
app.include_router(events.router)
app.include_router(upload.router)
app.include_router(attrition.router)
app.include_router(coachees_table.router)
app.include_router(members.router)
app.include_router(api_events.router)
app.include_router(member_tracker.router)
app.include_router(transactions_api.router)