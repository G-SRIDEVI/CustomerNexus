# ShopSense BI Dashboard & Executive Reporting Guide

## Overview
The **ShopSense Business Intelligence (BI) Dashboard** provides enterprise decision-makers and marketplace administrators with real-time analytical visibility, machine learning demand forecasting, vendor benchmarking, customer RFM segmentation, and exportable executive reports.

---

## Executive Feature Specifications

### 1. Executive Anomaly Insights & Inventory Health Alert
- Real-time notification banner identifying anomalous sales volume surges (e.g. +28% week-over-week demand increases) and inventory warnings.
- **One-Click Sync**: Triggers automated cross-service state synchronization between MongoDB transactional records and the Python SQLite analytics engine.

### 2. High-Level KPI Summary Cards
- **Marketplace GMV**: Total Gross Merchandise Value generated across all merchant transactions.
- **Profit Margin**: Net marketplace profit calculation (flat 15% rate or configurable margin rules).
- **Active Vendors**: Live count of registered merchants active in the platform.
- **Forecast Accuracy**: Real-time evaluation score ($R^2$) of the active `LinearRegression` model tracked in MLflow.

### 3. MLflow Model Experiment Registry Tracking
- Live display of MLflow experiment parameters:
  - **Experiment Name**: `ShopSense_Forecasting`
  - **Active Run ID**: Unique UUID generated per model training execution.
  - **Model Parameters**: Intercept ($\beta_0$) and Slope ($\beta_1$).
  - **Weekly Forecast Projections**: 4-week future revenue estimates calculated by scikit-learn.

### 4. Marketplace Vendor Performance Benchmarking
- Dynamic ranking table ordering merchants by total GMV revenue.
- **Fulfillment Rate Progress Meter**: Visual percentage indicator representing order completion performance.
- **Vendor-Specific Filter**: Allows filtering the entire BI canvas down to a single selected vendor or viewing the consolidated marketplace.

### 5. Customer Intelligence & RFM Tier Classification
- RFM (Recency, Frequency, Monetary) customer segmentation:
  - 👑 **Premium Tier**: High spend ($\ge \text{₹}500$) and high frequency ($\ge 3$ orders).
  - 🥇 **Gold Tier**: Moderate spend ($\ge \text{₹}250$) or multiple orders.
  - 🥈 **Silver Tier**: Active buyers with at least 1 order.
  - 👤 **Regular Tier**: Registered users awaiting initial checkout.

### 6. Executive Reporting & Export Modules
- **Export CSV**: Instant client-side generation of structured CSV files containing vendor rankings and demand projections.
- **Export PDF / Executive Print View**: Formatted stylesheet for clean, printable executive reports hiding navigation controls and highlighting visual cards and charts.

---

## Data Pipeline Flow

```
[MongoDB Transactions] ──(POST /analytics/sync)──> [SQLite Analytics DB]
                                                           │
                                                           ▼
                                                [scikit-learn Pipeline]
                                                           │
                                                           ▼
                                               [MLflow Model Registry]
                                                           │
                                                           ▼
                                             [FastAPI REST Response]
                                                           │
                                                           ▼
                                             [Chart.js BI Dashboards]
```
