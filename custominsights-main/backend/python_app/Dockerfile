# ─────────────────────────────────────────────────────────────
# ShopSense – Python FastAPI Analytics Engine
# Base: python:3.11-slim (security-patched minimal image)
# ─────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

# Set environment variables to prevent .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies required for psycopg2 and other C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ─────────────────────────────────────────────────────────────
# Stage 2: Dependencies
# ─────────────────────────────────────────────────────────────
FROM base AS dependencies

WORKDIR /app

# Copy requirements first for Docker layer caching
COPY requirements.txt .
RUN pip install -r requirements.txt

# ─────────────────────────────────────────────────────────────
# Stage 3: Production
# ─────────────────────────────────────────────────────────────
FROM dependencies AS production

# Create non-root user
RUN groupadd -r shopsense && useradd -r -g shopsense shopsense

WORKDIR /app

# Copy the entire python_app source
COPY . .

# Create directories for MLflow artifacts and SQLite database (mounted as volumes)
RUN mkdir -p /app/mlruns /app/data && \
    chown -R shopsense:shopsense /app

USER shopsense

# Expose FastAPI port
EXPOSE 8000

# Health check – verifies the API root is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:8000/ || exit 1

# Start the FastAPI service via uvicorn
# Points to app/main.py:app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
