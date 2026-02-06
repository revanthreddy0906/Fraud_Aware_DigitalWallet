"""
Transactions Router - Transaction management with fraud detection
"""

from datetime import datetime, timedelta
from typing import Optional, List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from database.connection import get_db
from models import User, Transaction, KnownDevice, KnownLocation, Alert
from routers.auth import get_current_user
from services.fraud_detection import FraudDetectionEngine
from services.behavior_baseline import BehaviorBaselineService

router = APIRouter(prefix="/transactions", tags=["Transactions"])


# Pydantic models
class TransactionCreate(BaseModel):
    amount: float
    recipient: str
    description: Optional[str] = None
    device_id: Optional[str] = None
    location: Optional[str] = None


class TransactionConfirm(BaseModel):
    txn_id: int
    confirmed: bool


class TransactionResponse(BaseModel):
    txn_id: int
    amount: float
    transaction_type: str
    recipient: str
    description: str
    timestamp: str
    anomaly_score: int
    risk_level: str
    risk_factors: list
    status: str
    requires_confirmation: bool


# Routes
@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_user)
):
    """Get current wallet balance and status"""
    # Check if wallet should be unfrozen
    if current_user.wallet_status == 'frozen' and current_user.freeze_until:
        if datetime.now() > current_user.freeze_until:
            # Keep freeze_until! Used by velocity check to reset count
            current_user.wallet_status = 'active'
    
    return {
        "balance": float(current_user.balance) if current_user.balance else 0,
        "wallet_status": current_user.wallet_status,
        "freeze_until": current_user.freeze_until.isoformat() if current_user.freeze_until else None,
        "currency": "USD"
    }


@router.post("/send")
async def send_money(
    transaction: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initiate a transaction with fraud detection.
    Returns fraud analysis and may require confirmation.
    """
    # Check if wallet is frozen
    if current_user.wallet_status == 'frozen':
        if current_user.freeze_until and datetime.now() < current_user.freeze_until:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Wallet is frozen until {current_user.freeze_until.isoformat()}"
            )
        else:
            # Auto-unfreeze if time has passed
            # Keep freeze_until! Used by velocity check to reset count
            current_user.wallet_status = 'active'
    
    # Check balance
    if Decimal(str(transaction.amount)) > current_user.balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Run fraud detection
    fraud_engine = FraudDetectionEngine(db)
    fraud_result = fraud_engine.evaluate_transaction(
        user_id=current_user.user_id,
        amount=transaction.amount,
        device_id=transaction.device_id or "unknown",
        location=transaction.location or "Unknown",
        timestamp=datetime.now()
    )
    
    # Handle auto-freeze for velocity limit exceeded
    if fraud_result.get("should_auto_freeze"):
        freeze_minutes = current_user.freeze_duration_minutes or 30
        current_user.wallet_status = 'frozen'
        current_user.freeze_until = datetime.now() + timedelta(minutes=freeze_minutes)
        
        # Create blocked transaction record
        blocked_txn = Transaction(
            user_id=current_user.user_id,
            amount=Decimal(str(transaction.amount)),
            transaction_type='debit',
            recipient=transaction.recipient,
            description=transaction.description or f"Payment to {transaction.recipient}",
            device_id=transaction.device_id,
            location=transaction.location,
            anomaly_score=fraud_result["anomaly_score"],
            risk_level=fraud_result["risk_level"],
            risk_factors=fraud_result["risk_factors"],
            status='blocked',
            requires_confirmation=False
        )
        db.add(blocked_txn)
        
        # Create auto-freeze alert
        velocity_count = fraud_result.get("velocity_count", 0)
        auto_freeze_alert = Alert(
            user_id=current_user.user_id,
            txn_id=None,  # Will be updated after commit
            alert_type='auto_freeze',
            severity='critical',
            message=f"Wallet auto-frozen: {velocity_count} transactions in 10 minutes exceeded limit of {current_user.max_txns_10min}"
        )
        db.add(auto_freeze_alert)
        db.commit()
        db.refresh(blocked_txn)
        
        # Update alert with transaction id
        auto_freeze_alert.txn_id = blocked_txn.txn_id
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": "auto_freeze",
                "message": f"Wallet frozen for {freeze_minutes} minutes due to high transaction velocity ({velocity_count} transactions in 10 minutes)",
                "freeze_until": current_user.freeze_until.isoformat(),
                "velocity_count": velocity_count,
                "max_allowed": current_user.max_txns_10min
            }
        )
    
    # Create transaction record
    new_txn = Transaction(
        user_id=current_user.user_id,
        amount=Decimal(str(transaction.amount)),
        transaction_type='debit',
        recipient=transaction.recipient,
        description=transaction.description or f"Payment to {transaction.recipient}",
        device_id=transaction.device_id,
        location=transaction.location,
        anomaly_score=fraud_result["anomaly_score"],
        risk_level=fraud_result["risk_level"],
        risk_factors=fraud_result["risk_factors"],
        status='pending' if fraud_result["requires_confirmation"] else 'completed',
        requires_confirmation=fraud_result["requires_confirmation"]
    )
    
    db.add(new_txn)
    
    # If transaction doesn't require confirmation, process immediately
    if not fraud_result["requires_confirmation"]:
        current_user.balance -= Decimal(str(transaction.amount))
        new_txn.status = 'completed'
        
        # Update behavior baseline
        baseline_service = BehaviorBaselineService(db)
        baseline_service.update_after_transaction(current_user.user_id, transaction.amount)
    
    db.commit()
    db.refresh(new_txn)
    
    # Create alerts if there are risk factors
    if fraud_result["risk_factors"]:
        fraud_engine.create_alerts(
            user_id=current_user.user_id,
            txn_id=new_txn.txn_id,
            risk_factors=fraud_result["risk_factors"],
            alerts_messages=fraud_result["alerts"]
        )
    
    return {
        "transaction": new_txn.to_dict(),
        "fraud_analysis": fraud_result,
        "message": "Transaction requires confirmation" if fraud_result["requires_confirmation"] 
                   else "Transaction completed successfully"
    }


@router.post("/confirm")
async def confirm_transaction(
    confirmation: TransactionConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm or cancel a pending high-risk transaction.
    If not confirmed within timeout, wallet will be frozen.
    """
    txn = db.query(Transaction).filter(
        Transaction.txn_id == confirmation.txn_id,
        Transaction.user_id == current_user.user_id,
        Transaction.status == 'pending'
    ).first()
    
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending transaction not found"
        )
    
    if confirmation.confirmed:
        # Confirm and process transaction
        if Decimal(str(txn.amount)) > current_user.balance:
            txn.status = 'cancelled'
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
        
        current_user.balance -= txn.amount
        txn.status = 'completed'
        txn.confirmed_at = datetime.now()
        
        # Update behavior baseline
        baseline_service = BehaviorBaselineService(db)
        baseline_service.update_after_transaction(current_user.user_id, float(txn.amount))
        
        db.commit()
        return {
            "message": "Transaction confirmed and completed",
            "transaction": txn.to_dict()
        }
    else:
        # Cancel transaction
        txn.status = 'cancelled'
        db.commit()
        return {
            "message": "Transaction cancelled",
            "transaction": txn.to_dict()
        }


@router.post("/timeout/{txn_id}")
async def handle_timeout(
    txn_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle transaction timeout - freeze wallet if no response.
    Called by frontend when 60-second timer expires.
    """
    txn = db.query(Transaction).filter(
        Transaction.txn_id == txn_id,
        Transaction.user_id == current_user.user_id,
        Transaction.status == 'pending'
    ).first()
    
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending transaction not found"
        )
    
    # Cancel the transaction
    txn.status = 'blocked'
    
    # Freeze the wallet
    freeze_minutes = current_user.freeze_duration_minutes or 30
    current_user.wallet_status = 'frozen'
    current_user.freeze_until = datetime.now() + timedelta(minutes=freeze_minutes)
    
    db.commit()
    
    return {
        "message": f"Transaction blocked. Wallet frozen for {freeze_minutes} minutes.",
        "freeze_until": current_user.freeze_until.isoformat(),
        "transaction": txn.to_dict()
    }


@router.get("/history")
async def get_transaction_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    risk_level: Optional[str] = None,
    transaction_type: Optional[str] = None
):
    """
    Get transaction history with optional filters.
    Supports pagination and date range filtering.
    """
    query = db.query(Transaction).filter(Transaction.user_id == current_user.user_id)
    
    # Apply filters
    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            query = query.filter(Transaction.timestamp >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            query = query.filter(Transaction.timestamp <= end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    if risk_level and risk_level in ['low', 'medium', 'high']:
        query = query.filter(Transaction.risk_level == risk_level)
    
    if transaction_type and transaction_type in ['credit', 'debit']:
        query = query.filter(Transaction.transaction_type == transaction_type)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    transactions = query.order_by(Transaction.timestamp.desc()).offset(offset).limit(limit).all()
    
    return {
        "transactions": [t.to_dict() for t in transactions],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/risk-timeline")
async def get_risk_timeline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=90)
):
    """
    Get risk scores over time for visualization.
    Returns daily average anomaly scores.
    """
    start_date = datetime.now() - timedelta(days=days)
    
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.timestamp >= start_date
    ).order_by(Transaction.timestamp.asc()).all()
    
    # Group by date
    daily_scores = {}
    for txn in transactions:
        date_key = txn.timestamp.strftime("%Y-%m-%d")
        if date_key not in daily_scores:
            daily_scores[date_key] = {"scores": [], "count": 0}
        daily_scores[date_key]["scores"].append(txn.anomaly_score)
        daily_scores[date_key]["count"] += 1
    
    # Calculate averages
    timeline = []
    for date, data in sorted(daily_scores.items()):
        avg_score = sum(data["scores"]) / len(data["scores"]) if data["scores"] else 0
        timeline.append({
            "date": date,
            "avg_anomaly_score": round(avg_score, 1),
            "transaction_count": data["count"],
            "max_score": max(data["scores"]) if data["scores"] else 0
        })
    
    return {
        "timeline": timeline,
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.now().isoformat()
    }


@router.get("/stats")
async def get_transaction_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transaction statistics for the dashboard"""
    # This month's transactions
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    monthly_txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.timestamp >= month_start,
        Transaction.status == 'completed'
    ).all()
    
    # Calculate stats
    total_spent = sum(float(t.amount) for t in monthly_txns if t.transaction_type == 'debit')
    total_received = sum(float(t.amount) for t in monthly_txns if t.transaction_type == 'credit')
    
    # Risk breakdown
    risk_counts = {"low": 0, "medium": 0, "high": 0}
    for txn in monthly_txns:
        if txn.risk_level in risk_counts:
            risk_counts[txn.risk_level] += 1
    
    # All-time stats
    all_txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.status == 'completed'
    ).count()
    
    blocked_txns = db.query(Transaction).filter(
        Transaction.user_id == current_user.user_id,
        Transaction.status == 'blocked'
    ).count()
    
    return {
        "this_month": {
            "total_spent": round(total_spent, 2),
            "total_received": round(total_received, 2),
            "transaction_count": len(monthly_txns)
        },
        "risk_breakdown": risk_counts,
        "all_time": {
            "completed_transactions": all_txns,
            "blocked_transactions": blocked_txns
        }
    }


@router.get("/export")
async def export_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    format: str = Query("csv", regex="^(csv|json)$"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """
    Export transactions in CSV or JSON format.
    Returns data that can be downloaded by the frontend.
    """
    query = db.query(Transaction).filter(Transaction.user_id == current_user.user_id)
    
    if start_date:
        try:
            start = datetime.fromisoformat(start_date)
            query = query.filter(Transaction.timestamp >= start)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    
    if end_date:
        try:
            end = datetime.fromisoformat(end_date)
            query = query.filter(Transaction.timestamp <= end)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    transactions = query.order_by(Transaction.timestamp.desc()).all()
    
    if format == "json":
        return {
            "format": "json",
            "data": [t.to_dict() for t in transactions],
            "count": len(transactions),
            "exported_at": datetime.now().isoformat()
        }
    else:
        # CSV format - return structured data for frontend to convert
        csv_data = []
        for t in transactions:
            csv_data.append({
                "Date": t.timestamp.strftime("%Y-%m-%d %H:%M:%S") if t.timestamp else "",
                "Type": t.transaction_type,
                "Amount": float(t.amount),
                "Recipient": t.recipient or "",
                "Description": t.description or "",
                "Status": t.status,
                "Risk Level": t.risk_level,
                "Anomaly Score": t.anomaly_score
            })
        
        return {
            "format": "csv",
            "data": csv_data,
            "columns": ["Date", "Type", "Amount", "Recipient", "Description", "Status", "Risk Level", "Anomaly Score"],
            "count": len(transactions),
            "exported_at": datetime.now().isoformat()
        }
