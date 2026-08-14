import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from controllers.analytics import revenue_analysis
from controllers.forecasting import run_sales_forecasting_pipeline
from sync_mongo import sync_data_from_mongodb
from pymongo import MongoClient

router = APIRouter()

@router.post("/sync")
def trigger_sync():
    """Triggers the MongoDB to SQL sync process"""
    try:
        sync_data_from_mongodb()
        return {"success": True, "message": "Data synchronized successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@router.get("/revenue")
def get_revenue_analysis(db: Session = Depends(get_db)):
    """Computes GMV, Profit Margin, growth rates for all vendors"""
    try:
        return revenue_analysis(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast")
@router.post("/forecast")
def run_forecast_pipeline(db: Session = Depends(get_db)):
    """Trains the LinearRegression model, logs to MLflow registry, and gets forecasts"""
    try:
        # First sync data to ensure fresh forecasts
        sync_data_from_mongodb()
        # Train model and generate results
        results = run_sales_forecasting_pipeline(db)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/customer-intelligence")
def get_customer_intelligence():
    """Performs customer behavior intelligence and RFM tier segmentation"""
    try:
        env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if "=" in line and not line.strip().startswith("#"):
                        key, val = line.strip().split("=", 1)
                        os.environ[key.strip()] = val.strip()

        MONGO_URI = os.getenv(
            "MONGO_URI",
            "mongodb+srv://shopsenseadmin:shopinsights123@cluster0.lx6ppii.mongodb.net/shopsense?retryWrites=true&w=majority&appName=Cluster0"
        )
        
        client = MongoClient(MONGO_URI)
        mongo_db = client.get_database("shopsense")
        
        users = list(mongo_db["users"].find({"role": "user"}))
        orders = list(mongo_db["orders"].find({}))
        
        intelligence = {
            "premium": [],
            "gold": [],
            "silver": [],
            "regular": [],
            "frequent": [],
            "dormant": []
        }
        
        for u in users:
            u_id = str(u["_id"])
            user_orders = [o for o in orders if str(o.get("userId")) == u_id]
            total_spend = sum(o.get("totalAmount", 0.0) for o in user_orders)
            order_count = len(user_orders)
            
            # Simple purchase count (simulated 30-day window based on seeded metrics)
            purchase_count = order_count
            
            customer_profile = {
                "id": u_id,
                "name": u.get("name", "Customer"),
                "email": u.get("email", ""),
                "spend": round(total_spend, 2),
                "order_count": order_count,
                "reward_points": u.get("rewardPoints", 0)
            }
            
            # Tiers classification
            if total_spend >= 500 and order_count >= 3:
                intelligence["premium"].append(customer_profile)
            elif total_spend >= 250 or order_count >= 2:
                intelligence["gold"].append(customer_profile)
            elif total_spend >= 100 or order_count >= 1:
                intelligence["silver"].append(customer_profile)
            else:
                intelligence["regular"].append(customer_profile)
                
            # Classify as active frequent buyers vs dormant
            if purchase_count >= 3:
                intelligence["frequent"].append(customer_profile)
            else:
                intelligence["dormant"].append(customer_profile)
                
        return {
            "success": True,
            "total_customers": len(users),
            "intelligence": intelligence
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
