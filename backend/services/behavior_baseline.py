"""
Behavior Baseline Service - Computes user behavior profiles from historical data
"""

from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal

from models import User, Transaction, BehaviorBaseline


class BehaviorBaselineService:
    """
    Service for computing and updating user behavior baselines
    based on historical transaction data.
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def compute_baseline(self, user_id: int) -> Optional[BehaviorBaseline]:
        """
        Compute or update behavior baseline for a user based on
        their transaction history.
        
        Returns:
            BehaviorBaseline object with computed values
        """
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return None
        
        # Get all completed transactions for the user
        transactions = self.db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.status == 'completed',
            Transaction.transaction_type == 'debit'  # Only analyze outgoing transactions
        ).all()
        
        if not transactions:
            # Create default baseline
            return self._create_default_baseline(user_id)
        
        # Compute statistics
        amounts = [float(txn.amount) for txn in transactions]
        avg_amount = sum(amounts) / len(amounts) if amounts else 0
        max_amount = max(amounts) if amounts else 0
        
        # Compute time patterns
        hours = [txn.timestamp.hour for txn in transactions if txn.timestamp]
        if hours:
            most_active_start = min(hours)
            most_active_end = max(hours)
        else:
            most_active_start = 9
            most_active_end = 21
        
        # Compute daily transaction count
        if transactions:
            date_range = (transactions[-1].timestamp - transactions[0].timestamp).days or 1
            typical_daily = len(transactions) / date_range
        else:
            typical_daily = 0
        
        # Compute velocity (transactions per 10 minutes)
        avg_velocity = self._compute_velocity_baseline(transactions)
        
        # Update or create baseline
        baseline = self.db.query(BehaviorBaseline).filter(
            BehaviorBaseline.user_id == user_id
        ).first()
        
        if baseline:
            baseline.avg_transaction_amount = Decimal(str(round(avg_amount, 2)))
            baseline.max_historical_amount = Decimal(str(round(max_amount, 2)))
            baseline.typical_txn_count_daily = int(typical_daily)
            baseline.most_active_hour_start = most_active_start
            baseline.most_active_hour_end = most_active_end
            baseline.avg_txns_per_10min = Decimal(str(round(avg_velocity, 2)))
            baseline.computed_at = datetime.now()
            baseline.transaction_count = len(transactions)
        else:
            baseline = BehaviorBaseline(
                user_id=user_id,
                avg_transaction_amount=Decimal(str(round(avg_amount, 2))),
                max_historical_amount=Decimal(str(round(max_amount, 2))),
                typical_txn_count_daily=int(typical_daily),
                most_active_hour_start=most_active_start,
                most_active_hour_end=most_active_end,
                avg_txns_per_10min=Decimal(str(round(avg_velocity, 2))),
                transaction_count=len(transactions)
            )
            self.db.add(baseline)
        
        self.db.commit()
        return baseline
    
    def _create_default_baseline(self, user_id: int) -> BehaviorBaseline:
        """Create a default baseline for users with no transaction history"""
        baseline = BehaviorBaseline(
            user_id=user_id,
            avg_transaction_amount=Decimal("0"),
            max_historical_amount=Decimal("0"),
            typical_txn_count_daily=0,
            most_active_hour_start=9,
            most_active_hour_end=21,
            avg_txns_per_10min=Decimal("1.0"),
            transaction_count=0
        )
        self.db.add(baseline)
        self.db.commit()
        return baseline
    
    def _compute_velocity_baseline(self, transactions: list) -> float:
        """
        Compute average number of transactions in 10-minute windows.
        """
        if len(transactions) < 2:
            return 1.0
        
        # Group transactions by 10-minute windows
        windows = {}
        for txn in transactions:
            if txn.timestamp:
                # Round to 10-minute window
                window_key = txn.timestamp.replace(
                    minute=(txn.timestamp.minute // 10) * 10,
                    second=0,
                    microsecond=0
                )
                windows[window_key] = windows.get(window_key, 0) + 1
        
        if not windows:
            return 1.0
        
        # Return average transactions per window
        avg = sum(windows.values()) / len(windows)
        return min(avg, 10.0)  # Cap at 10 for sanity
    
    def get_baseline(self, user_id: int) -> Optional[Dict]:
        """Get the current baseline for a user"""
        baseline = self.db.query(BehaviorBaseline).filter(
            BehaviorBaseline.user_id == user_id
        ).first()
        
        if baseline:
            return baseline.to_dict()
        
        # Compute if doesn't exist
        computed = self.compute_baseline(user_id)
        return computed.to_dict() if computed else None
    
    def update_after_transaction(self, user_id: int, new_amount: float) -> None:
        """
        Incrementally update baseline after a new transaction.
        More efficient than full recomputation.
        """
        baseline = self.db.query(BehaviorBaseline).filter(
            BehaviorBaseline.user_id == user_id
        ).first()
        
        if not baseline:
            self.compute_baseline(user_id)
            return
        
        # Update running average
        n = baseline.transaction_count
        current_avg = float(baseline.avg_transaction_amount)
        new_avg = (current_avg * n + new_amount) / (n + 1)
        
        baseline.avg_transaction_amount = Decimal(str(round(new_avg, 2)))
        baseline.transaction_count = n + 1
        
        # Update max if necessary
        if new_amount > float(baseline.max_historical_amount):
            baseline.max_historical_amount = Decimal(str(round(new_amount, 2)))
        
        baseline.computed_at = datetime.now()
        self.db.commit()
