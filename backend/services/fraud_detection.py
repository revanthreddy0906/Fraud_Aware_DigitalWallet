"""
Fraud Detection Engine - Core fraud detection logic with rule-based analysis
"""

from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
import math

from models import User, Transaction, KnownDevice, KnownLocation, BehaviorBaseline, Alert
from config import settings


class FraudDetectionEngine:
    """
    Core fraud detection engine that evaluates transactions against
    multiple behavioral and contextual rules.
    """
    
    # Risk point assignments for each rule
    RISK_POINTS = {
        "high_amount": 30,
        "exceeds_max": 40,
        "unusual_time": 20,
        "new_device": 25,
        "new_location": 25,
        "high_velocity": 35,
        "impossible_travel": 50,
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def evaluate_transaction(
        self,
        user_id: int,
        amount: float,
        device_id: str,
        location: str,
        timestamp: datetime = None
    ) -> Dict:
        """
        Evaluate a transaction for fraud indicators.
        
        Returns:
            Dict containing:
            - anomaly_score: 0-100 risk score
            - risk_level: low/medium/high
            - risk_factors: list of triggered rules
            - requires_confirmation: bool
            - alerts: list of alert messages
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        user = self.db.query(User).filter(User.user_id == user_id).first()
        if not user:
            return {"error": "User not found"}
        
        baseline = self.db.query(BehaviorBaseline).filter(
            BehaviorBaseline.user_id == user_id
        ).first()
        
        risk_factors = []
        alerts = []
        total_score = 0
        
        # Rule 1: Amount exceeds user-defined limit
        if Decimal(str(amount)) > user.max_txn_amount:
            risk_factors.append("exceeds_max")
            alerts.append(f"Transaction amount ${amount:,.2f} exceeds your limit of ${float(user.max_txn_amount):,.2f}")
            total_score += self.RISK_POINTS["exceeds_max"]
        
        # Rule 2: Amount significantly higher than average
        if baseline:
            avg_amount = float(baseline.avg_transaction_amount) if baseline.avg_transaction_amount else 0
            if avg_amount > 0 and amount > avg_amount * 3:
                risk_factors.append("high_amount")
                alerts.append(f"Transaction is {amount/avg_amount:.1f}x your average spending")
                total_score += self.RISK_POINTS["high_amount"]
        
        # Rule 3: Transaction outside allowed hours
        hour = timestamp.hour
        if hour < user.allowed_start_hour or hour > user.allowed_end_hour:
            risk_factors.append("unusual_time")
            alerts.append(f"Transaction at {hour}:00 is outside your allowed hours ({user.allowed_start_hour}:00 - {user.allowed_end_hour}:00)")
            total_score += self.RISK_POINTS["unusual_time"]
        
        # Rule 4: New/unknown device
        if device_id:
            known_device = self.db.query(KnownDevice).filter(
                KnownDevice.user_id == user_id,
                KnownDevice.device_fingerprint == device_id
            ).first()
            
            if not known_device:
                risk_factors.append("new_device")
                alerts.append("Transaction from unrecognized device")
                total_score += self.RISK_POINTS["new_device"]
        
        # Rule 5: New/unknown location
        if location:
            known_location = self.db.query(KnownLocation).filter(
                KnownLocation.user_id == user_id,
                KnownLocation.location_name == location
            ).first()
            
            if not known_location:
                risk_factors.append("new_location")
                alerts.append(f"Transaction from new location: {location}")
                total_score += self.RISK_POINTS["new_location"]
        
        # Rule 6: High transaction velocity
        # Pass freeze_until to reset velocity count after wallet was unfrozen
        velocity_score, should_auto_freeze, velocity_count = self._check_velocity(
            user_id, user.max_txns_10min, timestamp, user.freeze_until
        )
        if velocity_score > 0:
            risk_factors.append("high_velocity")
            alerts.append(f"High velocity: {velocity_count} transactions in last 10 minutes (limit: {user.max_txns_10min})")
            total_score += velocity_score
        
        # Rule 7: Impossible travel detection
        travel_score = self._check_impossible_travel(user_id, location, timestamp)
        if travel_score > 0:
            risk_factors.append("impossible_travel")
            alerts.append("Location change faster than physically possible")
            total_score += travel_score
        
        # Cap score at 100
        total_score = min(total_score, 100)
        
        # Determine risk level
        if total_score <= settings.RISK_LOW_THRESHOLD:
            risk_level = "low"
        elif total_score <= settings.RISK_MEDIUM_THRESHOLD:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        # High-risk transactions require confirmation
        requires_confirmation = risk_level == "high"
        
        # Auto-freeze if:
        # 1. Velocity limit exceeded (already calculated)
        # 2. Anomaly score is very high (>= 80)
        high_score_freeze = total_score >= 80
        should_auto_freeze = should_auto_freeze or high_score_freeze
        
        return {
            "anomaly_score": total_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "requires_confirmation": requires_confirmation,
            "alerts": alerts,
            "should_auto_freeze": should_auto_freeze,
            "velocity_count": velocity_count if 'velocity_count' in locals() else 0,
            "high_score_freeze": high_score_freeze
        }
    
    def _check_velocity(self, user_id: int, max_txns: int, timestamp: datetime, last_freeze_until: datetime = None) -> Tuple[int, bool, int]:
        """
        Check transaction velocity in the last 10 minutes.
        
        Only skips transactions before freeze_until if the freeze has ALREADY EXPIRED
        (i.e., freeze_until is in the past). This prevents counting old transactions
        that triggered the previous freeze.
        
        Returns:
            Tuple of (risk_score, should_auto_freeze, transaction_count)
        """
        ten_minutes_ago = timestamp - timedelta(minutes=10)
        
        # Only use freeze_until as cutoff if:
        # 1. freeze_until is set
        # 2. freeze_until is in the PAST (freeze has expired)
        # 3. freeze_until is more recent than 10 mins ago
        check_from = ten_minutes_ago
        if last_freeze_until and last_freeze_until <= timestamp and last_freeze_until > ten_minutes_ago:
            check_from = last_freeze_until
        
        recent_count = self.db.query(func.count(Transaction.txn_id)).filter(
            Transaction.user_id == user_id,
            Transaction.timestamp >= check_from,
            Transaction.status == 'completed'  # Only count completed, not blocked/pending
        ).scalar()
        
        # Auto-freeze when exceeding limit
        should_auto_freeze = recent_count >= max_txns
        
        if recent_count >= max_txns:
            return (self.RISK_POINTS["high_velocity"], should_auto_freeze, recent_count)
        elif recent_count >= max_txns - 1:
            return (self.RISK_POINTS["high_velocity"] // 2, False, recent_count)
        
        return (0, False, recent_count)
    
    def _check_impossible_travel(
        self, 
        user_id: int, 
        current_location: str, 
        timestamp: datetime
    ) -> int:
        """
        Check if the user could have physically traveled from their
        last transaction location to the current location.
        """
        if not current_location:
            return 0
        
        # Get the last transaction with a location
        last_txn = self.db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.location.isnot(None),
            Transaction.status == 'completed'
        ).order_by(Transaction.timestamp.desc()).first()
        
        if not last_txn or not last_txn.location:
            return 0
        
        # If same location, no issue
        if last_txn.location == current_location:
            return 0
        
        # Calculate time difference
        time_diff = timestamp - last_txn.timestamp
        hours_diff = time_diff.total_seconds() / 3600
        
        # Get coordinates for both locations
        last_coords = self._get_location_coords(user_id, last_txn.location)
        current_coords = self._get_location_coords(user_id, current_location)
        
        if not last_coords or not current_coords:
            # Can't determine distance, give benefit of doubt
            # but still flag as potentially suspicious if locations differ
            if hours_diff < 1:  # Less than 1 hour between different locations
                return self.RISK_POINTS["impossible_travel"] // 2
            return 0
        
        # Calculate distance (Haversine formula approximation)
        distance_km = self._haversine_distance(
            last_coords[0], last_coords[1],
            current_coords[0], current_coords[1]
        )
        
        # Assume max travel speed of 900 km/h (airplane)
        max_possible_distance = hours_diff * 900
        
        if distance_km > max_possible_distance:
            return self.RISK_POINTS["impossible_travel"]
        
        return 0
    
    def _get_location_coords(self, user_id: int, location_name: str) -> Optional[Tuple[float, float]]:
        """Get coordinates for a location from known_locations table"""
        known = self.db.query(KnownLocation).filter(
            KnownLocation.user_id == user_id,
            KnownLocation.location_name == location_name
        ).first()
        
        if known and known.latitude and known.longitude:
            return (float(known.latitude), float(known.longitude))
        
        # Fallback: use hardcoded coordinates for demo cities
        city_coords = {
            "New York, USA": (40.7128, -74.0060),
            "Los Angeles, USA": (34.0522, -118.2437),
            "Chicago, USA": (41.8781, -87.6298),
            "San Francisco, USA": (37.7749, -122.4194),
            "Seattle, USA": (47.6062, -122.3321),
            "Boston, USA": (42.3601, -71.0589),
            "Miami, USA": (25.7617, -80.1918),
            "Oakland, USA": (37.8044, -122.2712),
            "San Diego, USA": (32.7157, -117.1611),
            "Portland, USA": (45.5152, -122.6784),
        }
        
        return city_coords.get(location_name)
    
    def _haversine_distance(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def create_alerts(
        self,
        user_id: int,
        txn_id: int,
        risk_factors: List[str],
        alerts_messages: List[str]
    ) -> List[Alert]:
        """Create alert records for triggered fraud rules"""
        created_alerts = []
        
        # Map risk factors to valid alert types
        alert_type_map = {
            "exceeds_max": "high_amount",
            "high_amount": "high_amount",
            "unusual_time": "unusual_time",
            "new_device": "new_device",
            "new_location": "new_location",
            "high_velocity": "high_velocity",
            "impossible_travel": "impossible_travel",
        }
        
        severity_map = {
            "exceeds_max": "high",
            "high_amount": "medium",
            "unusual_time": "medium",
            "new_device": "high",
            "new_location": "high",
            "high_velocity": "high",
            "impossible_travel": "critical",
        }
        
        for i, factor in enumerate(risk_factors):
            message = alerts_messages[i] if i < len(alerts_messages) else f"Risk factor: {factor}"
            
            # Use mapped alert type or default to manual_freeze if unknown (safe fallback)
            alert_type = alert_type_map.get(factor, "manual_freeze")
            
            alert = Alert(
                user_id=user_id,
                txn_id=txn_id,
                alert_type=alert_type,
                severity=severity_map.get(factor, "medium"),
                message=message
            )
            self.db.add(alert)
            created_alerts.append(alert)
        
        self.db.commit()
        return created_alerts
