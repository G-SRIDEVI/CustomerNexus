from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from controllers.vendor_performance import vendor_ranking
from models import Vendor

router = APIRouter()

@router.get("/")
def get_vendors(db: Session = Depends(get_db)):
    vendors = db.query(Vendor).all()
    return [{
        "id": v.id,
        "business_name": v.business_name,
        "owner_name": v.owner_name,
        "email": v.email,
        "phone": v.phone,
        "business_type": v.business_type
    } for v in vendors]

@router.get("/ranking")
def get_vendor_ranking(db: Session = Depends(get_db)):
    return vendor_ranking(db)
