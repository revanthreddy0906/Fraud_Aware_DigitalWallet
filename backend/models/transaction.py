"""
Transaction model for SQLAlchemy ORM
"""

from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, DECIMAL, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base


class Transaction(Base):
    __tablename__ = "transactions"
    
    txn_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    # Transaction Details
    amount = Column(DECIMAL(15, 2), nullable=False)
    transaction_type = Column(Enum('credit', 'debit'), nullable=False)
    recipient = Column(String(100))
    description = Column(String(255))
    
    # Context Information
    timestamp = Column(DateTime, default=func.now())
    device_id = Column(String(255))
    location = Column(String(100))
    ip_address = Column(String(45))
    
    # Fraud Analysis Results
    anomaly_score = Column(Integer, default=0)
    risk_level = Column(Enum('low', 'medium', 'high'), default='low')
    risk_factors = Column(JSON, default=list)
    
    # Status
    status = Column(Enum('pending', 'completed', 'blocked', 'cancelled'), default='completed')
    requires_confirmation = Column(Boolean, default=False)
    confirmed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    alerts = relationship("Alert", back_populates="transaction")
    
    def to_dict(self):
        return {
            "txn_id": self.txn_id,
            "user_id": self.user_id,
            "amount": float(self.amount) if self.amount else 0,
            "transaction_type": self.transaction_type,
            "recipient": self.recipient,
            "description": self.description,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "device_id": self.device_id,
            "location": self.location,
            "ip_address": self.ip_address,
            "anomaly_score": self.anomaly_score,
            "risk_level": self.risk_level,
            "risk_factors": self.risk_factors or [],
            "status": self.status,
            "requires_confirmation": self.requires_confirmation,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None
        }
