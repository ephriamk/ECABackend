from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import employees, sales, eft, memberships, guests, kpi, first_workouts, tools, eft_calculations


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