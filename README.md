# WasteMan 🗑️📸

WasteMan is a hardware-software integrated food waste detection and tracking platform. It leverages a Raspberry Pi 5 with a Pi Camera and a machine learning model to visually detect food waste, track statistics, and display them in a modern web dashboard.

## 🏗️ Repository Structure

- **`backend/`**: A Node.js backend using Express and a SQLite database (`better-sqlite3`) to handle data persistence, session management, and API routes for the frontend.
- **`ui/`**: A modern web dashboard built with React, Vite, and TailwindCSS for visualizing food waste metrics, managing tracking sessions, and viewing reports.
- **`food_waste_detector/`**: Contains Python ML and hardware integration code. Uses PyTorch and a trained YOLOv11 model to perform inference on images captured via the Raspberry Pi Camera. It exposes its own REST API (via FastAPI/Uvicorn) that the backend connects to.

## 🚀 Getting Started Locally

The easiest way to start the entire stack securely is by using the root `start.sh` script.

1. Ensure you have Node.js and npm installed.
2. Install the frontend and backend dependencies if you haven't already:
   ```bash
   cd ui && npm install
   cd ../backend && npm install
   ```
3. Set up the Python virtual environment for the Daemon (if testing locally with Python installed).

### Starting All Services
To launch the Node backend, the React UI, and the Python daemon simultaneously:
```bash
./start.sh
```

- **Backend** will run on [`http://localhost:3001`](http://localhost:3001)
- **UI Dashboard** will run on [`http://localhost:5173`](http://localhost:5173)

### Stopping All Services
```bash
./start.sh stop
# Or securely press Ctrl+C while the start script is running
```

## 🍓 Raspberry Pi 5 Setup

To deploy the food waste ML detector and capture API specifically on the Raspberry Pi 5 hardware:

```bash
cd food_waste_detector
./run_rpi5.sh
```
This script will:
- Check for a connected Pi Camera.
- Create a Python virtual environment and install PyTorch (AArch64 compatible).
- Automatically download the required YOLOv11 food waste detection weights (~119MB).
- Start the Uvicorn REST API on port `8000` to handle camera captures and inference.

## 🛠️ Technology Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, SQLite (`better-sqlite3`)
- **Machine Learning**: Python, PyTorch, FastAPI
- **Hardware**: Raspberry Pi 5, Raspberry Pi Camera Module

