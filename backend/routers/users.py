"""
Users Router - Profile management and security settings
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models import User, KnownDevice, KnownLocation
from routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


# Pydantic models
class SecuritySettings(BaseModel):
    allowed_start_hour: Optional[int] = None
    allowed_end_hour: Optional[int] = None
    max_txn_amount: Optional[float] = None
    max_txns_10min: Optional[int] = None
    freeze_duration_minutes: Optional[int] = None


class AlertPreferences(BaseModel):
    alert_sms: Optional[bool] = None
    alert_email: Optional[bool] = None


class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None


# Routes
@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user profile with security settings"""
    return current_user.to_dict()


@router.put("/profile")
async def update_profile(
    profile: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile"""
    if profile.phone is not None:
        current_user.phone = profile.phone
    if profile.email is not None:
        # Check if email is taken by another user
        existing = db.query(User).filter(
            User.email == profile.email,
            User.user_id != current_user.user_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        current_user.email = profile.email
    
    db.commit()
    return current_user.to_dict()


@router.get("/security-settings")
async def get_security_settings(
    current_user: User = Depends(get_current_user)
):
    """Get user security settings"""
    return {
        "allowed_start_hour": current_user.allowed_start_hour,
        "allowed_end_hour": current_user.allowed_end_hour,
        "max_txn_amount": float(current_user.max_txn_amount) if current_user.max_txn_amount else 10000,
        "max_txns_10min": current_user.max_txns_10min,
        "freeze_duration_minutes": current_user.freeze_duration_minutes,
        "wallet_status": current_user.wallet_status,
        "freeze_until": current_user.freeze_until.isoformat() if current_user.freeze_until else None
    }


@router.put("/security-settings")
async def update_security_settings(
    settings: SecuritySettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user security settings"""
    if settings.allowed_start_hour is not None:
        if not 0 <= settings.allowed_start_hour <= 23:
            raise HTTPException(status_code=400, detail="Start hour must be 0-23")
        current_user.allowed_start_hour = settings.allowed_start_hour
    
    if settings.allowed_end_hour is not None:
        if not 0 <= settings.allowed_end_hour <= 23:
            raise HTTPException(status_code=400, detail="End hour must be 0-23")
        current_user.allowed_end_hour = settings.allowed_end_hour
    
    if settings.max_txn_amount is not None:
        if settings.max_txn_amount < 0:
            raise HTTPException(status_code=400, detail="Max amount cannot be negative")
        current_user.max_txn_amount = settings.max_txn_amount
    
    if settings.max_txns_10min is not None:
        if settings.max_txns_10min < 1:
            raise HTTPException(status_code=400, detail="Must allow at least 1 transaction")
        current_user.max_txns_10min = settings.max_txns_10min
    
    if settings.freeze_duration_minutes is not None:
        if settings.freeze_duration_minutes < 5:
            raise HTTPException(status_code=400, detail="Minimum freeze duration is 5 minutes")
        current_user.freeze_duration_minutes = settings.freeze_duration_minutes
    
    db.commit()
    return {"message": "Security settings updated", "settings": {
        "allowed_start_hour": current_user.allowed_start_hour,
        "allowed_end_hour": current_user.allowed_end_hour,
        "max_txn_amount": float(current_user.max_txn_amount),
        "max_txns_10min": current_user.max_txns_10min,
        "freeze_duration_minutes": current_user.freeze_duration_minutes
    }}


@router.get("/alert-preferences")
async def get_alert_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get user alert preferences"""
    return {
        "alert_sms": current_user.alert_sms,
        "alert_email": current_user.alert_email
    }


@router.put("/alert-preferences")
async def update_alert_preferences(
    preferences: AlertPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user alert preferences"""
    if preferences.alert_sms is not None:
        current_user.alert_sms = preferences.alert_sms
    if preferences.alert_email is not None:
        current_user.alert_email = preferences.alert_email
    
    db.commit()
    return {
        "message": "Alert preferences updated",
        "preferences": {
            "alert_sms": current_user.alert_sms,
            "alert_email": current_user.alert_email
        }
    }


@router.get("/devices")
async def get_known_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of known devices"""
    devices = db.query(KnownDevice).filter(
        KnownDevice.user_id == current_user.user_id
    ).all()
    return [d.to_dict() for d in devices]


@router.delete("/devices/{device_id}")
async def remove_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a known device"""
    device = db.query(KnownDevice).filter(
        KnownDevice.device_id == device_id,
        KnownDevice.user_id == current_user.user_id
    ).first()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db.delete(device)
    db.commit()
    return {"message": "Device removed"}


@router.get("/locations")
async def get_known_locations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of known locations"""
    locations = db.query(KnownLocation).filter(
        KnownLocation.user_id == current_user.user_id
    ).all()
    return [l.to_dict() for l in locations]


@router.delete("/locations/{location_id}")
async def remove_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a known location"""
    location = db.query(KnownLocation).filter(
        KnownLocation.location_id == location_id,
        KnownLocation.user_id == current_user.user_id
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    db.delete(location)
    db.commit()
    return {"message": "Location removed"}
