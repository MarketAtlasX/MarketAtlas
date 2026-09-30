# Production Deployment Guide

## Prerequisites
- Node.js 20+
- Python 3.10+
- Docker & Docker Compose (optional)

## Environment Variables
Create a `.env` file in the root:
```env
ENVIRONMENT=production
DATABASE_URL=sqlite:///./marketatlas.db
API_SECRET_KEY=generate_a_secure_key
ALLOWED_ORIGINS=https://app.marketatlas.ai
```

## Running with Docker Compose
```bash
docker compose up -d --build
```

## Manual Build
```bash
# Frontend
cd frontend
npm install
npm run build

# Backend
cd ../backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
