"""
User model for SQLAlchemy ORM
"""

from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20))
    
    # Security Preferences
    allowed_start_hour = Column(Integer, default=6)
    allowed_end_hour = Column(Integer, default=23)
    max_txn_amount = Column(DECIMAL(15, 2), default=10000.00)
    max_txns_10min = Column(Integer, default=5)
    
    # Wallet Status
    wallet_status = Column(Enum('active', 'frozen'), default='active')
    balance = Column(DECIMAL(15, 2), default=10000.00)
    freeze_until = Column(DateTime, nullable=True)
    freeze_duration_minutes = Column(Integer, default=30)
    
    # Alert Preferences
    alert_sms = Column(Boolean, default=True)
    alert_email = Column(Boolean, default=True)
    
    # Login Metadata
    last_login_time = Column(DateTime, nullable=True)
    last_login_location = Column(String(100))
    last_login_device = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    known_devices = relationship("KnownDevice", back_populates="user", cascade="all, delete-orphan")
    known_locations = relationship("KnownLocation", back_populates="user", cascade="all, delete-orphan")
    behavior_baseline = relationship("BehaviorBaseline", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "phone": self.phone,
            "allowed_start_hour": self.allowed_start_hour,
            "allowed_end_hour": self.allowed_end_hour,
            "max_txn_amount": float(self.max_txn_amount) if self.max_txn_amount else 0,
            "max_txns_10min": self.max_txns_10min,
            "wallet_status": self.wallet_status,
            "balance": float(self.balance) if self.balance else 0,
            "freeze_until": self.freeze_until.isoformat() if self.freeze_until else None,
            "freeze_duration_minutes": self.freeze_duration_minutes,
            "alert_sms": self.alert_sms,
            "alert_email": self.alert_email,
            "last_login_time": self.last_login_time.isoformat() if self.last_login_time else None,
            "last_login_location": self.last_login_location,
            "last_login_device": self.last_login_device,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
