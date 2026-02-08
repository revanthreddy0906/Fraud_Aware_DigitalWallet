# Fraud Aware Digital Wallet

![License](https://img.shields.io/badge/license-MIT-blue.svg) ![Python](https://img.shields.io/badge/python-3.9+-blue.svg) ![Next.js](https://img.shields.io/badge/next.js-13+-black.svg) ![FastAPI](https://img.shields.io/badge/FastAPI-0.95+-green.svg)

🔗 **Live Demo**: [https://fraud-aware-digital-wallet.vercel.app](https://fraud-aware-digital-wallet.vercel.app)

A high-performance digital wallet application with an integrated **AI-powered Fraud Detection Engine**. This system analyzes transactions in real-time using behavior baselines, velocity checks, and geolocation data to prevent fraudulent activities.

## 🚀 Key Features

-   **Real-time Fraud Scoring**: Evaluates every transaction against multiple risk factors instantly.
-   **Dynamic Velocity Checks**:
    -   **Soft Limit**: Triggers a warning popup requiring manual confirmation (e.g., >3 transactions/10 min).
    -   **Hard Limit**: Automatically freezes the wallet to prevent damage (e.g., >5 transactions/5 min).
-   **Geolocation Security**: Detects "Impossible Travel" (e.g., transactions from New York and London within 1 hour) and flags them as Critical.
-   **Behavioral Analysis**: Flags amounts significantly higher than user's average spending.
-   **Next.js Dashboard**: A premium, responsive UI with real-time alerts, spending charts, and risk analysis.
-   **Secure Backend**: FastAPI with SQLAlchemy and MySQL, featuring robust error handling and transaction management.

---

## 🛠️ Technology Stack

-   **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS, Recharts, Lucide Icons.
-   **Backend**: Python, FastAPI, SQLAlchemy, Pydantic.
-   **Database**: MySQL (via PyMySQL).
-   **Authentication**: JWT (JSON Web Tokens).

---

## 📊 System Architecture

### Transaction Flow
```mermaid
graph TD
    A[User Initiates Transaction] -->|POST /send| B(Fraud Engine Analysis)
    B --> C{Risk Score and Rules}
    C -->|Score < 60 Low/Medium| D[Approve Transaction]
    C -->|Score >= 60 High Risk| E[Trigger Warning Popup]
    C -->|Critical Violation| F[Auto-Freeze Wallet]
    
    E --> G{User Action}
    G -->|Confirm Identity| D
    G -->|Cancel| H[Cancel Transaction]
    G -->|Timeout 60s| I[Freeze Wallet]
    
    D --> J[Update Balance & Log DB]
    F --> K[Block Transaction & Notify User]
```

### Fraud Detection Logic (Velocity Check)
```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB
    
    User->>API: Send Money (Txn #4)
    API->>DB: Count txns in last 10 mins (Completed + Pending)
    DB-->>API: Count = 3
    
    alt Count >= Hard Limit (5)
        API->>User: 403 Forbidden (Wallet Frozen)
    else Count >= Soft Limit (3)
        API->>User: 200 OK (Requires Confirmation)
        User->>API: Box Popup Appears
    else Count < Limit
        API->>User: 200 OK (Success)
    end
```

---

## 🛡️ Fraud Rules & Scoring

The engine assigns risk points based on the following violations. A total score > 60 triggers a **High Risk** alert.

| Rule | Risk Points | Consequence |
| :--- | :--- | :--- |
| **High Velocity** | **85** | **Confirmation Required** (Soft Limit) |
| **Exceeds User Limit** | **80** | **Confirmation Required** |
| **Impossible Travel** | **90** | **Critical Alert** |
| High Amount (>3x Avg) | 40 | Alert (Medium) |
| New Device | 25 | Alert (Low/Medium) |
| New Location | 25 | Alert (Low/Medium) |
| Unusual Time | 20 | Alert (Low) |

---

## ⚡ Setup Instructions

### Prerequisites
-   Node.js 16+
-   Python 3.9+
-   MySQL Database

### 1. Database Setup
Ensure your MySQL server is running and create a database named `fraud_wallet`.
```sql
CREATE DATABASE fraud_wallet;
```

### 2. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` based on `config.py` (or check `settings` class):
```env
DATABASE_URL=mysql+pymysql://user:password@localhost/fraud_wallet
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Run the server:
```bash
uvicorn main:app --reload
```
*Server running at http://localhost:8000*

### 3. Frontend Setup
Navigate to the `frontend` directory:
```bash
cd frontend
npm install
```

Run the development server:
```bash
npm run dev
```
*App running at http://localhost:3000*

---

## 🔍 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/transactions/send` | Initiate a transaction. Runs fraud checks. |
| `POST` | `/transactions/confirm` | Confirm a flagged high-risk transaction. |
| `POST` | `/transactions/timeout/{id}` | Freeze wallet if user fails to confirm in time. |
| `GET` | `/alerts/unresolved` | Fetch active security alerts. |
| `GET` | `/transactions/risk-timeline` | Get risk history for dashboard charts. |

---

## 📱 User Interface Guide

1.  **Dashboard**: Overview of balance, spending, and blocked threats.
2.  **Send Money**: Enter amount and recipient.
    -   *Safe Txn*: Completes instantly.
    -   *Risky Txn*: Shows a "High Risk Transaction" modal with a 60s countdown.
3.  **Risk Analysis**: charts showing anomaly scores and recent alerts.
    -   **Refresh Button**: Use the clock icon to fetch the latest alerts instantly.
4.  **Profile**: Configure spending limits and safe hours.

---

## 🔒 Security Notes
-   **JWT Tokens** are used for all authenticated requests.
-   **CORS** is configured to allow only the frontend origin.
-   **SQL Injection Protection** is handled by SQLAlchemy ORM.
-   **Input Validation** is enforced by Pydantic schemas.

---
© 2026 Fraud Aware Digital Wallet. All Rights Reserved.
