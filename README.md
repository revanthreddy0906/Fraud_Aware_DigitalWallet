# 🛡️ Fraud-Aware Digital Wallet

A full-stack digital wallet application with real-time fraud detection, behavior-based risk analysis, and automatic security controls.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688?logo=fastapi)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)

## ✨ Features

### 🔐 Security & Fraud Detection
- **7-Rule Fraud Engine**: Detects suspicious transactions based on:
  - Amount limits (exceeds user's max or 3x average)
  - Time restrictions (outside allowed hours)
  - Device fingerprinting (new/unknown devices)
  - Location tracking (new geographic locations)
  - Velocity checks (too many transactions in 10 min)
  - Impossible travel detection
- **60-Second Confirmation**: High-risk transactions require user confirmation
- **Auto-Freeze**: Wallet automatically freezes on timeout/suspicious activity
- **Behavior Baseline**: Learns user spending patterns over time

### 💳 Wallet Features
- Send money with real-time fraud analysis
- Balance management with freeze/unfreeze controls
- Transaction history with filters and search
- CSV/JSON export for statements
- Risk timeline visualization

### 📊 Dashboard
- Modern dark-themed UI with glassmorphism
- Real-time alerts and notifications
- Risk analysis charts (severity distribution, alert types)
- Security settings management
- Device and location management

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, Recharts |
| **Backend** | FastAPI, SQLAlchemy, PyMySQL |
| **Database** | MySQL 8.0 |
| **Auth** | JWT (python-jose), bcrypt |

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL 8.0+

### 1. Clone the Repository
```bash
git clone https://github.com/revanthreddy0906/Fraud_Aware_DigitalWallet.git
cd Fraud_Aware_DigitalWallet
```

### 2. Set Up Database
```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed_data.sql
```

### 3. Configure Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Update `backend/config.py` with your MySQL credentials:
```python
DB_PASSWORD: str = "your_mysql_password"
```

### 4. Start Backend
```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload
```
API will be available at http://localhost:8000

### 5. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
App will be available at http://localhost:3000

## 🔑 Demo Credentials

| Username | Password |
|----------|----------|
| `demo_user` | `password123` |
| `john_doe` | `password123` |
| `jane_smith` | `password123` |

## 📁 Project Structure

```
Fraud_Aware_DigitalWallet/
├── backend/
│   ├── database/          # SQL schema and seed data
│   ├── models/            # SQLAlchemy ORM models
│   ├── routers/           # API endpoints
│   ├── services/          # Fraud detection engine
│   ├── config.py          # App configuration
│   └── main.py            # FastAPI entry point
│
└── frontend/
    └── src/
        ├── app/
        │   ├── dashboard/     # Dashboard pages
        │   │   ├── balance/
        │   │   ├── profile/
        │   │   ├── risk-analysis/
        │   │   ├── statement/
        │   │   └── transactions/
        │   └── page.tsx       # Login page
        └── lib/
            └── api.ts         # API client
```

## 🔒 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/register` | User registration |
| GET | `/auth/me` | Get current user |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transactions/send` | Send money (with fraud check) |
| POST | `/transactions/confirm` | Confirm high-risk transaction |
| GET | `/transactions/history` | Get transaction history |
| GET | `/transactions/balance` | Get current balance |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts` | Get all alerts |
| POST | `/alerts/freeze-wallet` | Manually freeze wallet |
| POST | `/alerts/unfreeze-wallet` | Unfreeze wallet |
| GET | `/alerts/behavior-baseline` | Get spending patterns |

## 🧪 Testing Fraud Detection

1. **Login** with `demo_user` / `password123`
2. **Go to "Send Money"**
3. **Trigger high-risk transaction**:
   - Enter amount > $10,000 (exceeds limit)
   - Select new location like "Tokyo, Japan"
   - A confirmation modal with 60-second countdown appears
4. **Don't confirm** → Wallet auto-freezes
5. **Check Risk Analysis** → View triggered alerts

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ by [Manish Reddy](https://github.com/revanthreddy0906)
