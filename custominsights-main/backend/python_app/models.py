from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(String, primary_key=True)
    business_name = Column(String, nullable=False)
    owner_name = Column(String)
    email = Column(String)
    phone = Column(String)
    business_type = Column(String)
    
    transactions = relationship("Transaction", back_populates="vendor")
    products = relationship("Product", back_populates="vendor")

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String)
    price = Column(Float)
    quantity = Column(Integer)
    vendor_id = Column(String, ForeignKey("vendors.id"))
    
    vendor = relationship("Vendor", back_populates="products")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True)
    vendor_id = Column(String, ForeignKey("vendors.id"))
    total_amount = Column(Float)
    date = Column(DateTime)
    
    vendor = relationship("Vendor", back_populates="transactions")
