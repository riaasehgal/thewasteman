#!/bin/bash
# =============================================================
# Food Waste Detector - Raspberry Pi 5 Setup & Run Script
# =============================================================
# This script sets up and runs the food waste detection API
# on a Raspberry Pi 5 with a Pi Camera.
#
# Prerequisites:
#   - Raspberry Pi 5 with Raspberry Pi OS (64-bit)
#   - Pi Camera connected via ribbon cable
#   - Camera enabled in raspi-config
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESTAPI_DIR="$SCRIPT_DIR/restapi"
WEIGHTS_DIR="$RESTAPI_DIR/server/yolo/weights"
WEIGHTS_FILE="$WEIGHTS_DIR/yolov11-x-weights-v6.pt"
VENV_DIR="$SCRIPT_DIR/.venv"

echo "============================================"
echo "  Food Waste Detector - RPi5 Setup"
echo "============================================"

# ---- Step 1: Check camera ----
echo ""
echo "[1/5] Checking Pi Camera..."
if rpicam-hello --list-cameras 2>&1 | grep -q "No cameras"; then
    echo "WARNING: No Pi Camera detected!"
    echo "  - Make sure the ribbon cable is connected properly"
    echo "  - Run 'sudo raspi-config' -> Interface Options -> Camera -> Enable"
    echo "  - Reboot after enabling"
    echo ""
    echo "Continuing anyway (you can still use the /api/detect upload endpoint)..."
else
    echo "Pi Camera detected!"
fi

# ---- Step 2: Create virtual env with system packages ----
echo ""
echo "[2/5] Setting up Python virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv --system-site-packages "$VENV_DIR"
    echo "Virtual environment created at $VENV_DIR"
else
    echo "Virtual environment already exists"
fi

source "$VENV_DIR/bin/activate"

# ---- Step 3: Install dependencies ----
echo ""
echo "[3/5] Installing Python dependencies..."

# Install PyTorch CPU-only for aarch64
pip install --quiet torch torchvision --index-url https://download.pytorch.org/whl/cpu 2>/dev/null || {
    echo "PyTorch CPU wheel install failed, trying fallback..."
    pip install --quiet torch torchvision
}

pip install --quiet -r "$RESTAPI_DIR/requirements-rpi5.txt"
echo "Dependencies installed!"

# ---- Step 4: Download model weights if needed ----
echo ""
echo "[4/5] Checking model weights..."
if [ ! -f "$WEIGHTS_FILE" ]; then
    echo "Downloading YOLOv11 food waste detection model (~119MB)..."
    mkdir -p "$WEIGHTS_DIR"
    wget -q --show-progress \
        "https://github.com/joaopferreira19/Food-Waste-Detection-using-YOLOv11/releases/download/0.3.0/yolov11-x-weights-v6.pt" \
        -O "$WEIGHTS_FILE"
    echo "Model weights downloaded!"
else
    echo "Model weights already present ($(du -h "$WEIGHTS_FILE" | cut -f1))"
fi

# ---- Step 5: Start the API server ----
echo ""
echo "[5/5] Starting Food Waste Detection API..."
echo "============================================"
echo "  API running at: http://$(hostname -I | awk '{print $1}'):8000"
echo ""
echo "  Endpoints:"
echo "    POST /api/detect         - Upload image for detection"
echo "    GET  /api/camera/status  - Check Pi Camera status"
echo "    POST /api/camera/capture - Capture image from Pi Camera"
echo "    POST /api/camera/detect  - Capture + detect food waste"
echo ""
echo "  Press Ctrl+C to stop"
echo "============================================"

cd "$RESTAPI_DIR"
uvicorn main:app --host 0.0.0.0 --port 8000
