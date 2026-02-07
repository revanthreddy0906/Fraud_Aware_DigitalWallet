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
    
    # Check max amount to prevent DB overflow (DECIMAL(15,2))
    if transaction.amount > 9999999999999:  # ~10 Trillion
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction amount too large (Max: 9,999,999,999,999.99)"
        )

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
    
    # Handle auto-freeze (Hard Limit or Critical Risk)
    if fraud_result.get("should_auto_freeze"):
        velocity_count = fraud_result.get("velocity_count", 0)
        high_score_freeze = fraud_result.get("high_score_freeze", False)
        freeze_minutes = current_user.freeze_duration_minutes or 30
        
        # Hard Freeze: Freeze wallet IMMEDIATELY
        current_user.wallet_status = 'frozen'
        current_user.freeze_until = datetime.now() + timedelta(minutes=freeze_minutes)
        
        # Create BLOCKED transaction
        blocked_txn = Transaction(
            user_id=current_user.user_id,
            amount=Decimal(str(transaction.amount)),
            transaction_type='debit',
            recipient=transaction.recipient,
            description=transaction.description or f"Payment to {transaction.recipient}",
            device_id=transaction.device_id,
            location=transaction.location,
            anomaly_score=fraud_result["anomaly_score"],
            risk_level="critical", 
            risk_factors=fraud_result["risk_factors"],
            status='blocked',
            requires_confirmation=False
        )
        db.add(blocked_txn)
        db.commit()
        db.refresh(blocked_txn)
        
        # Create Alert
        if high_score_freeze:
            alert_msg = f"CRITICAL: Transaction anomaly score {fraud_result['anomaly_score']}/100. Wallet auto-frozen."
            alert_type = 'auto_freeze'
        else:
            alert_msg = f"CRITICAL: Velocity Hard Limit Reached ({velocity_count} txns in 5 mins). Wallet auto-frozen."
            alert_type = 'high_velocity'
            
        alert = Alert(
            user_id=current_user.user_id,
            txn_id=blocked_txn.txn_id,
            alert_type=alert_type,
            severity='critical',
            message=alert_msg
        )
        db.add(alert)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Wallet frozen due to critical risk! ({alert_msg})"
        )

    # Handle Warning / Soft Limit (Confirmation Required)
    if fraud_result.get("requires_confirmation"):
        velocity_count = fraud_result.get("velocity_count", 0)
        
        # Create pending transaction
        pending_txn = Transaction(
            user_id=current_user.user_id,
            amount=Decimal(str(transaction.amount)),
            transaction_type='debit',
            recipient=transaction.recipient,
            description=transaction.description or f"Payment to {transaction.recipient}",
            device_id=transaction.device_id,
            location=transaction.location,
            anomaly_score=fraud_result["anomaly_score"],
            risk_level="high",  
            risk_factors=fraud_result["risk_factors"],
            status='pending',
            requires_confirmation=True
        )
        db.add(pending_txn)
        db.commit()
        db.refresh(pending_txn)
        
        # Prepare response
        return {
            "transaction": pending_txn.to_dict(),
            "fraud_analysis": {
                **fraud_result,
                "requires_confirmation": True,
                "freeze_warning": False, # No longer warning about freeze on confirm
                "velocity_warning": "high_velocity" in (fraud_result["risk_factors"] or []),
                "high_score_warning": fraud_result["anomaly_score"] >= 80,
                "max_allowed": current_user.max_txns_10min or 5
            },
            "message": "⚠️ High Risk / Velocity Warning. Please confirm this transaction."
        }
    
    # Create transaction record (Normal)
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
        status='completed',
        requires_confirmation=False
    )
    
    db.add(new_txn)
    
    # Process balance deduction
    current_user.balance -= Decimal(str(transaction.amount))
    
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
        "message": "Transaction completed successfully"
    }


@router.post("/confirm")
async def confirm_transaction(
    confirmation: TransactionConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm or cancel a pending high-risk transaction.
    If confirmed, transaction proceeds WITHOUT freezing (User authorized it).
    """
    # Debugging "Pending transaction not found"
    # First find by ID only
    txn = db.query(Transaction).filter(Transaction.txn_id == confirmation.txn_id).first()
    
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {confirmation.txn_id} not found"
        )
        
    if txn.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this transaction"
        )
        
    if txn.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transaction is already {txn.status}"
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
        # User REJECTED transaction (Clicked Cancel)
        # As per user clarification: "if he's available to check the alert... clicking cancel... account is not frozen"
        # Only TIMEOUT freezes the account.
        
        txn.status = 'cancelled'
        db.commit()
        
        # Create alert info but don't freeze
        alert = Alert(
            user_id=current_user.user_id,
            txn_id=txn.txn_id,
            alert_type='manual_freeze',
            severity='medium',
            message="User flagged and cancelled high-risk transaction."
        )
        db.add(alert)
        db.commit()
        db.refresh(txn)
        
        return {
            "message": "Transaction cancelled successfully. Your wallet remains active.",
            "transaction": txn.to_dict(),
            "wallet_frozen": False
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
    txn = db.query(Transaction).filter(Transaction.txn_id == txn_id).first()
    
    if not txn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {txn_id} not found"
        )
        
    if txn.user_id != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not own this transaction"
        )
        
    if txn.status != 'pending':
        # If already blocked/cancelled/completed, timeout is moot
        return {
            "message": f"Transaction was already {txn.status}",
            "freeze_until": current_user.freeze_until.isoformat() if current_user.freeze_until else None,
            "transaction": txn.to_dict()
        }
    
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
