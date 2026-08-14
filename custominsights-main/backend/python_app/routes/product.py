from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Product

router = APIRouter()

@router.get("/")
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return [{
        "id": p.id,
        "name": p.name,
        "category": p.category,
        "price": p.price,
        "quantity": p.quantity,
        "vendor_id": p.vendor_id
    } for p in products]
