"""
Alert model for SQLAlchemy ORM
"""

from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, Text, ForeignKey, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.connection import Base


class Alert(Base):
    __tablename__ = "alerts"
    
    alert_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    txn_id = Column(Integer, ForeignKey("transactions.txn_id", ondelete="SET NULL"), nullable=True)
    
    # Alert Details
    alert_type = Column(Enum('high_amount', 'unusual_time', 'new_device', 'new_location', 
                             'high_velocity', 'impossible_travel', 'auto_freeze', 'manual_freeze'), nullable=False)
    severity = Column(Enum('low', 'medium', 'high', 'critical'), nullable=False)
    message = Column(Text)
    
    # Status
    resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_note = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="alerts")
    transaction = relationship("Transaction", back_populates="alerts")
    
    def to_dict(self):
        return {
            "alert_id": self.alert_id,
            "user_id": self.user_id,
            "txn_id": self.txn_id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "message": self.message,
            "resolved": self.resolved,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolution_note": self.resolution_note,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class KnownDevice(Base):
    __tablename__ = "known_devices"
    
    device_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    device_fingerprint = Column(String(255), nullable=False)
    device_name = Column(String(100))
    first_seen = Column(DateTime, default=func.now())
    last_used = Column(DateTime, default=func.now())
    is_trusted = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="known_devices")
    
    def to_dict(self):
        return {
            "device_id": self.device_id,
            "device_fingerprint": self.device_fingerprint,
            "device_name": self.device_name,
            "first_seen": self.first_seen.isoformat() if self.first_seen else None,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "is_trusted": self.is_trusted
        }


class KnownLocation(Base):
    __tablename__ = "known_locations"
    
    location_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    location_name = Column(String(100), nullable=False)
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    first_seen = Column(DateTime, default=func.now())
    last_used = Column(DateTime, default=func.now())
    is_trusted = Column(Boolean, default=False)
    
    # Relationships
    user = relationship("User", back_populates="known_locations")
    
    def to_dict(self):
        return {
            "location_id": self.location_id,
            "location_name": self.location_name,
            "latitude": float(self.latitude) if self.latitude else None,
            "longitude": float(self.longitude) if self.longitude else None,
            "first_seen": self.first_seen.isoformat() if self.first_seen else None,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "is_trusted": self.is_trusted
        }




class BehaviorBaseline(Base):
    __tablename__ = "behavior_baselines"
    
    baseline_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Transaction Patterns
    avg_transaction_amount = Column(DECIMAL(15, 2), default=0)
    max_historical_amount = Column(DECIMAL(15, 2), default=0)
    typical_txn_count_daily = Column(Integer, default=0)
    
    # Time Patterns
    most_active_hour_start = Column(Integer, default=9)
    most_active_hour_end = Column(Integer, default=21)
    
    # Velocity Patterns
    avg_txns_per_10min = Column(DECIMAL(5, 2), default=1.0)
    
    # Metadata
    computed_at = Column(DateTime, default=func.now())
    transaction_count = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="behavior_baseline")
    
    def to_dict(self):
        return {
            "baseline_id": self.baseline_id,
            "user_id": self.user_id,
            "avg_transaction_amount": float(self.avg_transaction_amount) if self.avg_transaction_amount else 0,
            "max_historical_amount": float(self.max_historical_amount) if self.max_historical_amount else 0,
            "typical_txn_count_daily": self.typical_txn_count_daily,
            "most_active_hour_start": self.most_active_hour_start,
            "most_active_hour_end": self.most_active_hour_end,
            "avg_txns_per_10min": float(self.avg_txns_per_10min) if self.avg_txns_per_10min else 0,
            "computed_at": self.computed_at.isoformat() if self.computed_at else None,
            "transaction_count": self.transaction_count
        }
