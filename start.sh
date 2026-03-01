#!/usr/bin/env bash
# ── TrashTrack: start all services ──────────────────────────────────
# Usage: ./start.sh        (start everything)
#        ./start.sh stop   (kill everything)

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

stop_all() {
    echo "Stopping all services..."
    # Send SIGTERM first (triggers GPIO cleanup handler)
    pkill -f "run_session.py" 2>/dev/null || true
    sleep 2
    # Force kill if still alive
    pkill -9 -f "run_session.py" 2>/dev/null || true
    pkill -f "node src/server.js" 2>/dev/null || true
    pkill -f "npx vite" 2>/dev/null || true
    sleep 1
    echo "All stopped."
}

if [[ "${1:-}" == "stop" ]]; then
    stop_all
    exit 0
fi

# Kill any stale processes first
stop_all

# 1. Backend
echo "Starting backend on :3001..."
cd "$DIR/backend"
node src/server.js &
BACKEND_PID=$!
sleep 1

# 2. UI
echo "Starting UI on :5173..."
cd "$DIR/ui"
npx vite --host 0.0.0.0 &
UI_PID=$!
sleep 1

# 3. Daemon
echo "Starting Pi daemon (1s captures)..."
cd "$DIR/food_waste_detector/restapi"
source "$DIR/env/bin/activate"
python run_session.py &
DAEMON_PID=$!

echo ""
echo "════════════════════════════════════════"
echo "  TrashTrack running!"
echo "  Backend:  http://localhost:3001"
echo "  UI:       http://localhost:5173"
echo "  Daemon:   PID $DAEMON_PID"
echo ""
echo "  Stop all: ./start.sh stop"
echo "  Or:       Ctrl+C"
echo "════════════════════════════════════════"

# Wait for Ctrl+C, then clean up
trap 'echo ""; stop_all; exit 0' INT TERM
wait
