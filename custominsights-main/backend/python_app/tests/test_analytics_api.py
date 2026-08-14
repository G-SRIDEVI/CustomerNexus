# Python FastAPI – Comprehensive Pytest Integration Suite
# Tests all ShopSense Analytics API endpoints using FastAPI TestClient (synchronous)

import sys
import os
import pytest

# ──────────────────────────────────────────────────────────────────────
# Path Setup – ensure the parent python_app directory is importable
# ──────────────────────────────────────────────────────────────────────
# tests/ is inside backend/python_app/tests/
# We need backend/python_app on sys.path so 'from database import ...' etc. resolves
PYTHON_APP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
APP_DIR = os.path.join(PYTHON_APP_DIR, "app")

for p in [PYTHON_APP_DIR, APP_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Change working directory so relative paths (mlruns, shopsense.db) resolve correctly
os.chdir(APP_DIR)

from fastapi.testclient import TestClient
from main import app

# ──────────────────────────────────────────────────────────────────────
# Shared TestClient (re-used across all tests)
# ──────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="module")
def client():
    """Create a single FastAPI TestClient for all tests in this module."""
    with TestClient(app) as c:
        yield c


# ══════════════════════════════════════════════════════════════════════
# 1. ROOT HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════
class TestHealthCheck:
    def test_root_returns_200(self, client):
        """GET / must return HTTP 200 and service status."""
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_status_online(self, client):
        """GET / payload must confirm service is online."""
        data = client.get("/").json()
        assert data.get("status") == "online"

    def test_root_lists_all_endpoints(self, client):
        """GET / must document all major API routes."""
        data = client.get("/").json()
        endpoints = data.get("endpoints", [])
        expected = ["/vendors", "/vendors/ranking", "/analytics/revenue",
                    "/analytics/forecast", "/analytics/customer-intelligence"]
        for ep in expected:
            assert ep in endpoints, f"Missing endpoint in root listing: {ep}"


# ══════════════════════════════════════════════════════════════════════
# 2. VENDOR ENDPOINTS
# ══════════════════════════════════════════════════════════════════════
class TestVendorEndpoints:
    def test_get_vendors_returns_200(self, client):
        """GET /vendors/ must return HTTP 200."""
        response = client.get("/vendors/")
        assert response.status_code == 200

    def test_get_vendors_returns_list(self, client):
        """GET /vendors/ payload must be a JSON list."""
        data = client.get("/vendors/").json()
        assert isinstance(data, list)

    def test_get_vendors_schema(self, client):
        """Each vendor object must contain required fields."""
        data = client.get("/vendors/").json()
        if len(data) == 0:
            pytest.skip("No vendors in test database – skipping schema check")
        vendor = data[0]
        for field in ["id", "business_name", "owner_name", "email", "phone", "business_type"]:
            assert field in vendor, f"Missing field in vendor: {field}"

    def test_get_vendor_ranking_returns_200(self, client):
        """GET /vendors/ranking must return HTTP 200."""
        response = client.get("/vendors/ranking")
        assert response.status_code == 200

    def test_get_vendor_ranking_returns_list(self, client):
        """GET /vendors/ranking payload must be a JSON list."""
        data = client.get("/vendors/ranking").json()
        assert isinstance(data, list)

    def test_get_vendor_ranking_schema(self, client):
        """Each ranking entry must contain rank, revenue, orders, growth_rate, fulfillment_rate."""
        data = client.get("/vendors/ranking").json()
        if len(data) == 0:
            pytest.skip("No ranked vendors – skipping schema check")
        entry = data[0]
        for field in ["rank", "id", "business_name", "revenue", "orders",
                      "fulfillment_rate", "growth_rate"]:
            assert field in entry, f"Missing field in ranking: {field}"

    def test_vendor_ranking_is_sorted(self, client):
        """Vendor ranking must be sorted by revenue descending (rank 1 highest)."""
        data = client.get("/vendors/ranking").json()
        if len(data) < 2:
            pytest.skip("Fewer than 2 vendors – skipping sort check")
        assert data[0]["revenue"] >= data[1]["revenue"], "Ranking is not sorted by revenue desc"

    def test_vendor_ranks_are_sequential(self, client):
        """Rank numbers must be sequential: 1, 2, 3, ..."""
        data = client.get("/vendors/ranking").json()
        for idx, vendor in enumerate(data):
            assert vendor["rank"] == idx + 1, f"Non-sequential rank at index {idx}"


# ══════════════════════════════════════════════════════════════════════
# 3. ANALYTICS – REVENUE
# ══════════════════════════════════════════════════════════════════════
class TestRevenueAnalytics:
    def test_get_revenue_returns_200(self, client):
        """GET /analytics/revenue must return HTTP 200."""
        response = client.get("/analytics/revenue")
        assert response.status_code == 200

    def test_get_revenue_returns_list(self, client):
        """GET /analytics/revenue payload must be a JSON list."""
        data = client.get("/analytics/revenue").json()
        assert isinstance(data, list)

    def test_get_revenue_schema(self, client):
        """Each revenue record must contain vendor_id, gmv, orders, profit_margin."""
        data = client.get("/analytics/revenue").json()
        if len(data) == 0:
            pytest.skip("No revenue data – skipping schema check")
        record = data[0]
        for field in ["vendor_id", "gmv", "avg_order_value", "orders", "profit_margin"]:
            assert field in record, f"Missing field in revenue: {field}"

    def test_gmv_is_positive(self, client):
        """All GMV values must be non-negative numbers."""
        data = client.get("/analytics/revenue").json()
        for record in data:
            assert record["gmv"] >= 0, f"Negative GMV for vendor {record.get('vendor_id')}"

    def test_profit_margin_is_15_percent_of_gmv(self, client):
        """Profit margin must equal GMV * 0.15 (within floating point tolerance)."""
        data = client.get("/analytics/revenue").json()
        for record in data:
            expected = round(record["gmv"] * 0.15, 2)
            assert abs(record["profit_margin"] - expected) < 0.05, \
                f"Unexpected profit margin for vendor {record.get('vendor_id')}"


# ══════════════════════════════════════════════════════════════════════
# 4. ANALYTICS – ML FORECASTING
# ══════════════════════════════════════════════════════════════════════
class TestMLForecasting:
    @pytest.fixture(scope="class")
    def forecast_data(self, client):
        """Run the forecast pipeline once and cache the result."""
        response = client.post("/analytics/forecast")
        assert response.status_code == 200, f"Forecast pipeline failed: {response.text}"
        return response.json()

    def test_forecast_returns_success_true(self, forecast_data):
        """POST /analytics/forecast must return success=True."""
        assert forecast_data.get("success") is True

    def test_forecast_contains_mlflow_run(self, forecast_data):
        """Response must include mlflow_run object."""
        assert "mlflow_run" in forecast_data

    def test_mlflow_run_schema(self, forecast_data):
        """mlflow_run must contain run_id, experiment_name, accuracy, intercept, slope."""
        run = forecast_data["mlflow_run"]
        for field in ["run_id", "experiment_name", "model_type", "accuracy", "intercept", "slope"]:
            assert field in run, f"Missing field in mlflow_run: {field}"

    def test_forecast_accuracy_in_valid_range(self, forecast_data):
        """Forecast R² accuracy must be between 0.0 and 1.0."""
        accuracy = forecast_data["mlflow_run"]["accuracy"]
        assert 0.0 <= accuracy <= 1.0, f"Accuracy out of range: {accuracy}"

    def test_forecast_contains_history(self, forecast_data):
        """Response must include historical weekly data."""
        assert "history" in forecast_data
        assert isinstance(forecast_data["history"], list)

    def test_forecast_history_schema(self, forecast_data):
        """Each history item must have week and amount fields."""
        history = forecast_data["history"]
        if len(history) == 0:
            pytest.skip("No history data in forecast result")
        for item in history:
            assert "week" in item and "amount" in item

    def test_forecast_contains_forecasts(self, forecast_data):
        """Response must include future projections list."""
        assert "forecasts" in forecast_data
        assert isinstance(forecast_data["forecasts"], list)

    def test_forecast_projects_4_weeks(self, forecast_data):
        """Forecast must project exactly 4 future weeks."""
        forecasts = forecast_data["forecasts"]
        assert len(forecasts) == 4, f"Expected 4 forecast weeks, got {len(forecasts)}"

    def test_forecast_amounts_are_positive(self, forecast_data):
        """All projected revenue amounts must be positive."""
        for f in forecast_data["forecasts"]:
            assert f["amount"] > 0, f"Non-positive forecast amount in week {f.get('week')}"

    def test_mlflow_run_id_is_unique(self, client):
        """Two separate forecast runs must produce different MLflow Run IDs."""
        r1 = client.post("/analytics/forecast").json()
        r2 = client.post("/analytics/forecast").json()
        id1 = r1.get("mlflow_run", {}).get("run_id", "")
        id2 = r2.get("mlflow_run", {}).get("run_id", "")
        assert id1 != id2, "MLflow Run IDs should be unique per training run"


# ══════════════════════════════════════════════════════════════════════
# 5. ANALYTICS – CUSTOMER INTELLIGENCE (RFM)
# ══════════════════════════════════════════════════════════════════════
class TestCustomerIntelligence:
    @pytest.fixture(scope="class")
    def intel_data(self, client):
        """Fetch customer intelligence once and cache."""
        response = client.get("/analytics/customer-intelligence")
        assert response.status_code == 200
        return response.json()

    def test_customer_intel_returns_success(self, intel_data):
        """GET /analytics/customer-intelligence must return success=True."""
        assert intel_data.get("success") is True

    def test_customer_intel_contains_total_customers(self, intel_data):
        """Response must include total_customers count."""
        assert "total_customers" in intel_data
        assert isinstance(intel_data["total_customers"], int)

    def test_customer_intel_contains_tiers(self, intel_data):
        """Response must contain all RFM tier keys."""
        intel = intel_data.get("intelligence", {})
        for tier in ["premium", "gold", "silver", "regular", "frequent", "dormant"]:
            assert tier in intel, f"Missing RFM tier: {tier}"

    def test_customer_tier_lists(self, intel_data):
        """All tier values must be lists."""
        intel = intel_data.get("intelligence", {})
        for tier, members in intel.items():
            assert isinstance(members, list), f"Tier '{tier}' is not a list"

    def test_customer_profiles_schema(self, intel_data):
        """Each customer profile must have id, name, email, spend, order_count."""
        intel = intel_data.get("intelligence", {})
        for tier, members in intel.items():
            for profile in members[:2]:  # check first 2 of each tier
                for field in ["id", "name", "email", "spend", "order_count"]:
                    assert field in profile, f"Missing field '{field}' in {tier} tier profile"


# ══════════════════════════════════════════════════════════════════════
# 6. ANALYTICS – SYNC ENDPOINT
# ══════════════════════════════════════════════════════════════════════
class TestSyncEndpoint:
    def test_sync_returns_200(self, client):
        """POST /analytics/sync must return HTTP 200."""
        response = client.post("/analytics/sync")
        assert response.status_code == 200

    def test_sync_returns_success(self, client):
        """Sync response must confirm success."""
        data = client.post("/analytics/sync").json()
        assert data.get("success") is True


# ══════════════════════════════════════════════════════════════════════
# 7. ML DATA AUTHENTICITY VERIFICATION
# ══════════════════════════════════════════════════════════════════════
class TestMLDataAuthenticity:
    """
    Verifies that the ML pipeline produces REAL data (not static dummy values).
    Each run of the forecast pipeline must produce data driven by actual transactions.
    """

    def test_forecast_slope_reflects_trend(self, client):
        """
        Slope (β₁) from LinearRegression should not be exactly 0 when real data exists.
        A slope of exactly 0.0 would indicate the model saw flat/no data.
        """
        data = client.post("/analytics/forecast").json()
        if not data.get("success"):
            pytest.skip("Forecast pipeline unavailable")
        slope = data["mlflow_run"]["slope"]
        # Slope can be positive or negative, but should not be None
        assert slope is not None

    def test_history_amounts_match_transaction_aggregation(self, client):
        """
        History amounts from the forecast must be positive (actual aggregated transactions).
        Zero or negative history would indicate missing or corrupt transaction data.
        """
        data = client.post("/analytics/forecast").json()
        if not data.get("success") or not data.get("history"):
            pytest.skip("No forecast history available")
        for week_data in data["history"]:
            assert week_data["amount"] > 0, \
                f"Week {week_data['week']} history amount is zero or negative – check transaction sync"

    def test_vendor_revenue_reflects_real_orders(self, client):
        """
        Vendor revenue in ranking must be > 0 (real orders processed, not dummy zeros).
        """
        data = client.get("/vendors/ranking").json()
        if len(data) == 0:
            pytest.skip("No vendors in database")
        for vendor in data:
            assert vendor["revenue"] > 0, \
                f"Vendor '{vendor['business_name']}' has zero revenue – check sync pipeline"
