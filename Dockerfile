# ==============================================================================
# Multi-Service SDN Network Slicing & AI Dashboard Container
# Node 22 (Debian Bookworm) + Bun + Python 3.12 (via uv)
# ==============================================================================
FROM node:22-bookworm

# Non-interactive apt & unbuffered Python output
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# 1. Install base utilities, compilation tools, and Docker CLI
# (docker.io allows server.js and server-onos.js to inspect the host's ONOS container)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    build-essential \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# 3. Install Astral uv (ultra-fast Python package and environment manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install Python 3.12 runtime managed by uv
RUN uv python install 3.12

WORKDIR /app

# 4. Install Python dependencies in anomaly/.venv first (leverages Docker layer cache)
COPY anomaly/requirements.txt ./anomaly/
RUN cd /app/anomaly && \
    uv venv .venv --python 3.12 && \
    uv pip install --python .venv/bin/python --no-cache torch==2.14.0+cpu --index-url https://download.pytorch.org/whl/cpu && \
    uv pip install --python .venv/bin/python --no-cache -r requirements.txt

# Pre-cache the sentence-transformers model inside the image so intent translation works instantly 100% offline
RUN cd /app/anomaly && \
    .venv/bin/python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Put anomaly virtual environment in PATH for direct Python tool invocations
ENV PATH="/app/anomaly/.venv/bin:$PATH"

# 5. Install Node.js dependencies using Bun (leverages Docker layer cache)
COPY package.json bun.lock* ./
RUN bun install

# 6. Copy full application source code
COPY . .

# Ensure entrypoint and startup orchestrator scripts are executable
RUN chmod +x ./docker-entrypoint.sh ./start_services.sh

# Ports exposed:
#   5000: DevStack / OpenStack Backend Server (server.js)
#   5001: ONOS Slicing Middleware Server     (server-onos.js)
#   5002: Offline RF Anomaly Detector         (anomaly/rf_detector.py)
#   5003: Online IF Anomaly Detector          (anomaly/detector.py)
#   5005: Local Neural Intent Service         (anomaly/intent_service.py)
#   5173: React / Vite Web Dashboard          (vite)
EXPOSE 5000 5001 5002 5003 5005 5173

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["./start_services.sh", "--with-frontend"]
