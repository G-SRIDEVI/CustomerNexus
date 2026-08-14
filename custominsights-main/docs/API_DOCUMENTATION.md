# ShopSense Analytics & E-Commerce Platform - API Documentation

## Overview
ShopSense provides a dual-engine API architecture:
1. **Node.js Express API (Port 5000)**: Serves core e-commerce CRUD operations, authentication, orders, cart management, and merchant operations.
2. **Python FastAPI Analytics Service (Port 8000)**: Serves high-performance marketplace analytics, ML forecasting models (`LinearRegression`), vendor benchmarking, and customer intelligence.

---

## Base URLs
- **Node.js Express Server**: `http://localhost:5000/api`
- **FastAPI Analytics Engine**: `http://localhost:8000`

---

## Python FastAPI Analytics Endpoints (`http://localhost:8000`)

### 1. Vendor Intelligence
#### `GET /vendors`
Fetch a list of registered vendors and overall performance metrics.
- **Response `200 OK`**:
```json
[
  {
    "id": "v101",
    "business_name": "smart gadgets",
    "total_revenue": 148500.0,
    "completed_orders": 42,
    "average_rating": 4.8
  }
]
```

#### `GET /vendors/ranking`
Fetch marketplace benchmarking rankings sorted by total GMV revenue.
- **Response `200 OK`**:
```json
[
  {
    "rank": 1,
    "business_name": "smart gadgets",
    "revenue": 8130000.0,
    "orders": 98,
    "fulfillment_rate": 96.2
  }
]
```

---

### 2. Revenue Analytics & Sales Forecasting
#### `GET /analytics/revenue`
Calculates aggregated marketplace revenue, category splits, and daily growth rates.
- **Response `200 OK`**:
```json
{
  "total_marketplace_revenue": 9487500.0,
  "growth_rate_pct": 14.5,
  "category_revenue": {
    "Electronics": 4500000.0,
    "Fashion": 2500000.0,
    "Beauty": 1487500.0,
    "Home Decor": 1000000.0
  }
}
```

#### `GET /analytics/forecast`
Runs `LinearRegression` sales forecasting trained via MLflow (`ShopSense_Forecasting`).
- **Query Parameters**: `days` (integer, default: 30)
- **Response `200 OK`**:
```json
{
  "forecast_period_days": 30,
  "projected_revenue": 182400.0,
  "daily_forecast": [
    { "date": "2026-08-03", "predicted_sales": 6080.0 }
  ],
  "model_info": {
    "model_name": "LinearRegression",
    "experiment_name": "ShopSense_Forecasting",
    "r2_score": 0.942,
    "status": "Production"
  }
}
```

---

### 3. Customer Intelligence & Cross-Service Sync
#### `GET /analytics/customer-intelligence`
Returns RFM (Recency, Frequency, Monetary) segmentation and customer lifetime value metrics.
- **Response `200 OK`**:
```json
{
  "total_customers": 1250,
  "active_buyers_pct": 78.4,
  "rfm_segments": {
    "Champions": 320,
    "Loyal Customers": 450,
    "At Risk": 110
  }
}
```

#### `POST /analytics/sync`
Synchronizes state between Node.js Express database and Python FastAPI analytics engine.
- **Response `200 OK`**:
```json
{
  "status": "success",
  "synced_records": 142,
  "timestamp": "2026-08-02T13:45:00Z"
}
```

---

## Node.js Express REST Endpoints (`http://localhost:5000/api`)

### Authentication
- `POST /api/auth/register` - Register customer account
- `POST /api/auth/login` - Authenticate customer credentials
- `POST /api/vendor/login` - Authenticate merchant credentials
- `POST /api/admin/login` - Authenticate admin console

### Products & Inventory
- `GET /api/products` - List products with category/stock filters
- `POST /api/products` - Create new merchant product
- `PUT /api/products/:id` - Update existing product details
- `DELETE /api/products/:id` - Remove product from catalog

### Orders & Checkout
- `GET /api/orders` - List customer/vendor orders
- `POST /api/orders` - Place new customer order
- `PUT /api/orders/:id/status` - Update order status (Pending, Shipped, Delivered)
