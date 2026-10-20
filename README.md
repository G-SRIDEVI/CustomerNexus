# ShopSense - Enterprise Analytics & E-Commerce Platform

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/shopsense/platform)
[![Version](https.img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/shopsense/platform)
[![FastAPI](https://img.shields.io/badge/Analytics-FastAPI_0.100+-009688.svg)](https://fastapi.tiangolo.com)
[![Express](https://img.shields.io/badge/Backend-Node.js_Express_4.19+-000000.svg)](https://expressjs.com)
[![MLflow](https://img.shields.io/badge/ML-MLflow_Tracking-0194E2.svg)](https://mlflow.org)

## Executive Summary & Milestone 4 Capabilities

**ShopSense** is an enterprise-grade, hybrid microservices e-commerce and business intelligence analytics platform. It combines a high-throughput Node.js Express transactional backend with a high-performance Python FastAPI predictive analytics engine, integrated with `scikit-learn` machine learning pipelines and `MLflow` model experiment tracking.

### Milestone 4 Key Deliverables (Weeks 7–8):
- **Deployable Analytics Platform**: Containerized microservices architecture with `docker-compose.yml`, PM2 process management configs, and Systemd unit definitions.
- **Advanced Executive BI Dashboards**: Interactive Chart.js visual analytics, RFM customer tier segmentation, real-time KPI metrics, vendor benchmarking, and printable executive reports with CSV exports.
- **Comprehensive Integration & Regression Suite**: Automated test suite (`validate_milestone4.js`) verifying Express endpoints, FastAPI analytics pipelines, ML accuracy criteria, cross-service sync routines, and high-concurrency latency benchmarks (<200ms target).
- **Complete Enterprise Documentation**: Published technical architecture reference, dual-engine API documentation, MLflow model tracking specifications, and deployment guides.

---

## Architectural Overview

```
                               ┌─────────────────────────────────────┐
                               │          Client Web Browser         │
                               └──────────────────┬──────────────────┘
                                                  │
                                ┌─────────────────┴─────────────────┐
                                │                                   │
                                ▼                                   ▼
            ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐
            │    Node.js Express Server (:5000)   │ │     Python FastAPI Engine (:8000)   │
            │  - User Auth & JWT                  │ │  - Vendor Intelligence              │
            │  - Product & Order CRUD             │ │  - Revenue Analysis                 │
            │  - Cart & Checkout                  │ │  - LinearRegression Sales Forecast │
            └──────────────────┬──────────────────┘ └──────────────────┬──────────────────┘
                               │                                       │
                               ▼                                       ▼
            ┌─────────────────────────────────────┐ ┌─────────────────────────────────────┐
            │       MongoDB / Memory Store        │ │       MLflow Model Registry         │
            └─────────────────────────────────────┘ └─────────────────────────────────────┘
```

---

## Microservices Breakdown

| Service Module | Technology | Port | Core Responsibilities |
|---|---|---|---|
| **E-Commerce Backend** | Node.js v18+, Express | `5000` | User auth, products, orders, cart checkout, transactions, admin management |
| **Analytics Engine** | Python 3.10+, FastAPI, Uvicorn | `8000` | Revenue aggregation, GMV calculations, ML model forecasting, customer RFM segmentation, data sync |
| **Model Registry** | MLflow, Scikit-Learn | Local `/mlruns` | Experiment tracking, model weight logging, metric monitoring ($R^2$, RMSE, MAE) |
| **Frontend Consoles** | HTML5, Vanilla CSS3, JS, Chart.js | Static / HTTP | Executive BI dashboard, merchant dashboard, admin portal, storefront |

---

## Quick Start Guide

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB (Local instance or Cloud MongoDB Atlas URI)

### 1. Local Microservices Startup

#### Step A: Node.js Express Server (Port 5000)
```bash
cd backend
npm install
npm run dev
# Server running at http://localhost:5000
```

#### Step B: Python FastAPI Analytics Engine (Port 8000)
```bash
cd backend/python_app
pip install -r requirements.txt
python main.py
# Or using uvicorn:
# python -m uvicorn app.main:app --port 8000 --reload
```

---

## Docker Compose Deployment

Run the complete platform stack in containerized isolation:

```bash
docker-compose up --build -d
```

### Containers Managed:
- `node-app`: Express server on port `5000`
- `fastapi-app`: FastAPI analytics engine on port `8000`
- `mlflow-server`: MLflow tracking dashboard on port `5000`

---

## Integration & Regression Testing

To run the automated integration, performance, and regression test suite:

```bash
cd backend
node validate_milestone4.js
```

### Validation Matrix:
1. **Service Availability**: Express (5000) & FastAPI (8000) health checks.
2. **Express E-Commerce APIs**: `/api/products`, `/api/orders`.
3. **FastAPI Analytics & ML**: `/vendors/`, `/vendors/ranking`, `/analytics/revenue`, `/analytics/forecast`, `/analytics/customer-intelligence`, `/analytics/sync`.
4. **Latency & Concurrency SLA**: Single request benchmark < 300ms, 10 parallel async requests batch latency evaluation.

---

## Documentation Index

Detailed documentation is published in the `docs/` directory:

- 📘 [API Documentation](docs/API_DOCUMENTATION.md): Complete REST endpoint specifications for Node.js Express and Python FastAPI.
- 🏗️ [Architecture Reference](docs/ARCHITECTURE.md): Microservices design, data flows, and state synchronization strategy.
- 🚀 [Deployment Guide](docs/DEPLOYMENT_GUIDE.md): Development, Docker Compose, PM2, and Systemd deployment configurations.
- 🤖 [Analytics & MLflow Model Docs](docs/ANALYTICS_MODEL_DOCS.md): Scikit-Learn `LinearRegression` model specs, metric tracking, and promotion protocols.

---

## License & Support
ShopSense Enterprise Analytics Platform &copy; 2026. All rights reserved.
