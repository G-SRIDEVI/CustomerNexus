import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Append current directory and parent to sys.path for absolute imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from database import init_db
from sync_mongo import sync_data_from_mongodb
from routes import vendor, product, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INIT] Initializing SQLite database...")
    init_db()
    
    print("[SYNC] Running initial database sync from MongoDB...")
    try:
        sync_data_from_mongodb()
        print("[SUCCESS] Initial sync successful.")
    except Exception as e:
        print("[ERROR] Initial sync failed during startup. Service will still start. Error:", str(e))
    yield

app = FastAPI(
    title="ShopSense Analytics API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS to allow the frontend to access the API directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(vendor.router, prefix="/vendors", tags=["Vendors"])
app.include_router(product.router, prefix="/products", tags=["Products"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

@app.get("/")
def home():
    return {
        "status": "online",
        "service": "ShopSense Advanced Analytics API",
        "endpoints": [
            "/vendors",
            "/vendors/ranking",
            "/products",
            "/analytics/revenue",
            "/analytics/forecast",
            "/analytics/customer-intelligence",
            "/analytics/sync"
        ]
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
