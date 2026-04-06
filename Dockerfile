# ── GraphForge API ──
# Multi-stage build: install deps → copy source → run with uvicorn

FROM python:3.11-slim AS base

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY src/api/pyproject.toml ./
RUN pip install --no-cache-dir . || pip install --no-cache-dir \
    "fastapi>=0.111.0" \
    "uvicorn[standard]>=0.29.0" \
    "python-dotenv>=1.0.0" \
    "pydantic-settings>=2.0.0" \
    "google-adk[extensions]>=1.24.1" \
    "neo4j>=6.1.0" \
    "neo4j-graphrag>=1.0.0" \
    "clevercsv>=0.8.0" \
    "redis[hiredis]>=5.0.0" \
    "slowapi>=0.1.9" \
    "python-multipart>=0.0.9"

# ── Production stage ──
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from base
COPY --from=base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=base /usr/local/bin /usr/local/bin

# Copy application source
COPY src/api/ ./src/api/
COPY data/ ./data/

# Create directories for runtime data
RUN mkdir -p uploads data

ENV PYTHONPATH=/app/src/api
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
