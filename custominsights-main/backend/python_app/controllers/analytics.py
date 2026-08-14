from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Transaction

def revenue_analysis(db: Session):
    # Perform aggregation query using func
    results = db.query(
        Transaction.vendor_id,
        func.sum(Transaction.total_amount).label("gmv"),
        func.avg(Transaction.total_amount).label("avg_order_value"),
        func.count(Transaction.id).label("orders")
    ).group_by(Transaction.vendor_id).all()
    
    # Format and enrich results with profit margin and simulated growth trends
    formatted_results = []
    for r in results:
        gmv = float(r.gmv or 0)
        orders = int(r.orders or 0)
        avg_order_value = float(r.avg_order_value or 0)
        
        # Calculate simulated profit margin (say 15%)
        profit_margin = gmv * 0.15
        
        # Calculate simulated growth trend based on order count or random baseline
        growth_trend = round(12.5 + (orders % 3) * 5.2, 1) # e.g. 12.5%, 17.7%, 22.9%
        
        formatted_results.append({
            "vendor_id": r.vendor_id,
            "gmv": round(gmv, 2),
            "avg_order_value": round(avg_order_value, 2),
            "orders": orders,
            "profit_margin": round(profit_margin, 2),
            "growth_trend": growth_trend
        })
        
    return formatted_results
