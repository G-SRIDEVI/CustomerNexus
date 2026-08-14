import os
from datetime import datetime
from pymongo import MongoClient
from models import Vendor as SqlVendor, Product as SqlProduct, Transaction as SqlTransaction
from database import SessionLocal

# Load environment variables from the Express app's .env file
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                if "=" in line and not line.strip().startswith("#"):
                    key, val = line.strip().split("=", 1)
                    os.environ[key.strip()] = val.strip()

load_env()
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://shopsenseadmin:shopinsights123@cluster0.lx6ppii.mongodb.net/shopsense?retryWrites=true&w=majority&appName=Cluster0"
)

def sync_data_from_mongodb():
    print("[SYNC] Starting sync process from MongoDB to SQLite...")
    db = SessionLocal()
    try:
        client = MongoClient(MONGO_URI)
        mongo_db = client.get_database("shopsense")
        
        # 1. Sync Vendors
        vendors_collection = mongo_db["vendors"]
        mongo_vendors = list(vendors_collection.find({}))
        print(f"Syncing {len(mongo_vendors)} vendors...")
        for mv in mongo_vendors:
            vendor_id = str(mv["_id"])
            sql_v = db.query(SqlVendor).filter(SqlVendor.id == vendor_id).first()
            if not sql_v:
                sql_v = SqlVendor(id=vendor_id)
                db.add(sql_v)
            sql_v.business_name = mv.get("shopName", "Unknown Shop")
            sql_v.owner_name = mv.get("ownerName", "Unknown Owner")
            sql_v.email = mv.get("email", "")
            sql_v.phone = mv.get("phone", "")
            sql_v.business_type = mv.get("businessType", "Retail")
            
        db.commit()
        
        # 2. Sync Products
        products_collection = mongo_db["products"]
        mongo_products = list(products_collection.find({}))
        print(f"Syncing {len(mongo_products)} products...")
        for mp in mongo_products:
            prod_id = str(mp["_id"])
            sql_p = db.query(SqlProduct).filter(SqlProduct.id == prod_id).first()
            if not sql_p:
                sql_p = SqlProduct(id=prod_id)
                db.add(sql_p)
            sql_p.name = mp.get("productName", mp.get("name", "Unknown Product"))
            sql_p.category = mp.get("category", "General")
            sql_p.price = float(mp.get("price", 0))
            sql_p.quantity = int(mp.get("quantity", mp.get("stock", 0)))
            sql_p.vendor_id = str(mp.get("vendorId", ""))
            
        db.commit()
        
        # 3. Sync Transactions (Orders)
        orders_collection = mongo_db["orders"]
        mongo_orders = list(orders_collection.find({}))
        print(f"Found {len(mongo_orders)} orders in MongoDB. Translating to SQL transactions...")
        
        # We delete existing transactions to prevent double counting
        db.query(SqlTransaction).delete()
        db.commit()
        
        for mo in mongo_orders:
            order_id = str(mo["_id"])
            order_date = mo.get("orderDate", datetime.utcnow())
            if isinstance(order_date, str):
                try:
                    order_date = datetime.fromisoformat(order_date.replace("Z", "+00:00"))
                except:
                    order_date = datetime.utcnow()
                    
            # Sum up items per vendor in this order
            vendor_amounts = {}
            for item in mo.get("products", []):
                p_id = item.get("productId")
                if not p_id:
                    continue
                p_id_str = str(p_id)
                
                # Fetch vendorId for this product from the database
                prod = db.query(SqlProduct).filter(SqlProduct.id == p_id_str).first()
                if prod and prod.vendor_id:
                    v_id = prod.vendor_id
                    qty = int(item.get("quantity", 0))
                    price = float(item.get("price", 0))
                    vendor_amounts[v_id] = vendor_amounts.get(v_id, 0.0) + (qty * price)
                    
            # Insert a Transaction row in SQLite for each vendor included in the order
            for v_id, amount in vendor_amounts.items():
                # Make sure the vendor exists in SQLite (otherwise create placeholder)
                vendor_exists = db.query(SqlVendor).filter(SqlVendor.id == v_id).first()
                if not vendor_exists:
                    # Let's see if we can find it in mongo_vendors list
                    m_vend = next((mv for mv in mongo_vendors if str(mv["_id"]) == v_id), None)
                    new_v = SqlVendor(
                        id=v_id,
                        business_name=m_vend.get("shopName", "Placeholder Vendor") if m_vend else "Placeholder Vendor",
                        owner_name=m_vend.get("ownerName", "Placeholder Owner") if m_vend else "Placeholder Owner",
                        email=m_vend.get("email", "") if m_vend else "",
                        phone=m_vend.get("phone", "") if m_vend else "",
                        business_type=m_vend.get("businessType", "Retail") if m_vend else "Retail"
                    )
                    db.add(new_v)
                    db.commit()
                    
                txn = SqlTransaction(
                    id=f"{order_id}_{v_id}",
                    vendor_id=v_id,
                    total_amount=amount,
                    date=order_date
                )
                db.add(txn)
                
        db.commit()
        print("[SUCCESS] MongoDB data synchronization complete!")
    except Exception as e:
        db.rollback()
        print("[ERROR] Error during MongoDB data sync:", str(e))

    finally:
        db.close()

if __name__ == "__main__":
    sync_data_from_mongodb()
