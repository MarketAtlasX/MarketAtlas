"""Quick launcher for the DWS server."""
import sys
sys.path.insert(0, ".")

from world_state.server import app
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8004, log_level="info")
