# Backend Deployment Guide

## Deploy to Render

### Step 1: Create Cloud Database
Since Render can't connect to your local MySQL, you need a cloud database.

**Option A: Use Aiven (Free Tier)**
1. Go to https://aiven.io
2. Sign up and create a MySQL instance
3. Copy the connection URL

**Option B: Use PlanetScale**
1. Go to https://planetscale.com
2. Create a database
3. Get connection string

### Step 2: Deploy Backend to Render
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your repo: Fraud_Aware_DigitalWallet
5. Configure:
   - Name: fraud-wallet-api
   - Root Directory: backend
   - Runtime: Python 3
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT

### Step 3: Set Environment Variables in Render
Add these in Render's Environment tab:
- DB_HOST: (from your cloud database)
- DB_PORT: (usually 3306)
- DB_USER: (from your cloud database)
- DB_PASSWORD: (from your cloud database)
- DB_NAME: (from your cloud database)
- JWT_SECRET_KEY: your-production-secret-key
- DEBUG: false
