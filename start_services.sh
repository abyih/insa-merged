#!/usr/bin/env bash
# ==============================================================================
# SDN Network Slicing & AI Dashboard - Multi-Service Orchestrator
# ==============================================================================
# Services launched:
#   1. DevStack / OpenStack Backend Server (Node.js) -> Port 5000
#   2. ONOS Slicing Middleware Server     (Node.js) -> Port 5001
#   3. Offline RF Anomaly Detector         (Python)  -> Port 5002
#   4. Online IF Anomaly Detector          (Python)  -> Port 5003
#   5. Local Neural Intent Service         (Python)  -> Port 5005
# Optional:
#   6. React / Vite Frontend (pass --with-frontend or -f) -> Port 5173
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Text styles
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
DIM='\033[2m'
NC='\033[0m' # No Color

WITH_FRONTEND=false

for arg in "$@"; do
  case $arg in
    -f|--with-frontend|--frontend|--all)
      WITH_FRONTEND=true
      shift
      ;;
    -h|--help)
      echo -e "${BOLD}Usage:${NC} ./start_services.sh [options]"
      echo ""
      echo "Options:"
      echo "  -f, --with-frontend, --all    Also start Vite React frontend (port 5173)"
      echo "  -h, --help                    Display this help message"
      echo ""
      echo "Commands in package.json:"
      echo "  npm run services              Start all 5 backend services (Devstack, ONOS, RF, IF, Intent)"
      echo "  npm run all:services          Start all 5 services + Vite frontend"
      echo "  npm run anomaly:if            Start Online IF detector standalone (port 5003)"
      echo "  npm run anomaly:rf            Start Offline RF detector standalone (port 5002)"
      echo ""
      exit 0
      ;;
  esac
done

echo -e "${BOLD}${CYAN}==============================================================${NC}"
echo -e "${BOLD}${CYAN}   🚀 Starting SDN Dashboard Multi-Service Stack             ${NC}"
echo -e "${BOLD}${CYAN}==============================================================${NC}"
echo -e " ${BLUE}● [DEVSTACK]${NC} Server       : http://localhost:5000 (server.js)"
echo -e " ${CYAN}● [ONOS]${NC}     Server       : http://localhost:5001 (server-onos.js)"
echo -e " ${YELLOW}● [RF]${NC}       RF Detector  : http://localhost:5002 (anomaly/rf_detector.py)"
echo -e " ${MAGENTA}● [IF]${NC}       Online IF    : http://localhost:5003 (anomaly/detector.py)"
echo -e " ${DIM}● [INTENT]${NC}   Neural Engine: http://localhost:5005 (anomaly/intent_service.py)"
if [ "$WITH_FRONTEND" = true ]; then
  echo -e " ${GREEN}● [VITE]${NC}     React UI     : http://localhost:5173 (vite)"
fi
echo -e "${BOLD}${CYAN}==============================================================${NC}"
echo ""

if [ "$WITH_FRONTEND" = true ]; then
  exec npm run all:services
else
  exec npm run services
fi
