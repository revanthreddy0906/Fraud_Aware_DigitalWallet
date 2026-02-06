"""
Alerts Router - Alert management and wallet freeze controls
"""

from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models import User, Alert
from routers.auth import get_current_user
from services.behavior_baseline import BehaviorBaselineService

router = APIRouter(prefix="/alerts", tags=["Alerts"])


# Pydantic models
class AlertResolve(BaseModel):
    resolution_note: Optional[str] = None


class FreezeWallet(BaseModel):
    duration_minutes: Optional[int] = None  # Use user's default if not provided
    reason: Optional[str] = None


# Routes
@router.get("/")
async def get_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    resolved: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Get all alerts for the current user"""
    query = db.query(Alert).filter(Alert.user_id == current_user.user_id)
    
    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)
    
    total = query.count()
    alerts = query.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()
    
    return {
        "alerts": [a.to_dict() for a in alerts],
        "total": total,
        "limit": limit,
        "offset": offset,
        "unresolved_count": db.query(Alert).filter(
            Alert.user_id == current_user.user_id,
            Alert.resolved == False
        ).count()
    }


@router.get("/unresolved")
async def get_unresolved_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all unresolved alerts"""
    alerts = db.query(Alert).filter(
        Alert.user_id == current_user.user_id,
        Alert.resolved == False
    ).order_by(Alert.created_at.desc()).all()
    
    return {
        "alerts": [a.to_dict() for a in alerts],
        "count": len(alerts)
    }


@router.get("/{alert_id}")
async def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific alert"""
    alert = db.query(Alert).filter(
        Alert.alert_id == alert_id,
        Alert.user_id == current_user.user_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return alert.to_dict()


@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    resolution: AlertResolve,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark an alert as resolved"""
    alert = db.query(Alert).filter(
        Alert.alert_id == alert_id,
        Alert.user_id == current_user.user_id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.resolved = True
    alert.resolved_at = datetime.now()
    alert.resolution_note = resolution.resolution_note
    
    db.commit()
    return {
        "message": "Alert resolved",
        "alert": alert.to_dict()
    }


@router.post("/resolve-all")
async def resolve_all_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all alerts as resolved"""
    updated = db.query(Alert).filter(
        Alert.user_id == current_user.user_id,
        Alert.resolved == False
    ).update({
        "resolved": True,
        "resolved_at": datetime.now(),
        "resolution_note": "Bulk resolved"
    })
    
    db.commit()
    return {
        "message": f"Resolved {updated} alerts",
        "count": updated
    }


@router.post("/freeze-wallet")
async def freeze_wallet(
    freeze_request: FreezeWallet,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually freeze the wallet"""
    duration = freeze_request.duration_minutes or current_user.freeze_duration_minutes or 30
    
    current_user.wallet_status = 'frozen'
    current_user.freeze_until = datetime.now() + timedelta(minutes=duration)
    
    # Create an alert for manual freeze
    alert = Alert(
        user_id=current_user.user_id,
        alert_type='manual_freeze',
        severity='medium',
        message=freeze_request.reason or f"Wallet manually frozen for {duration} minutes"
    )
    db.add(alert)
    db.commit()
    
    return {
        "message": f"Wallet frozen for {duration} minutes",
        "wallet_status": "frozen",
        "freeze_until": current_user.freeze_until.isoformat()
    }


@router.post("/unfreeze-wallet")
async def unfreeze_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually unfreeze the wallet"""
    if current_user.wallet_status != 'frozen':
        raise HTTPException(
            status_code=400,
            detail="Wallet is not frozen"
        )
    
    current_user.wallet_status = 'active'
    current_user.freeze_until = None
    db.commit()
    
    return {
        "message": "Wallet unfrozen",
        "wallet_status": "active"
    }


@router.get("/stats")
async def get_alert_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=90)
):
    """Get alert statistics"""
    start_date = datetime.now() - timedelta(days=days)
    
    alerts = db.query(Alert).filter(
        Alert.user_id == current_user.user_id,
        Alert.created_at >= start_date
    ).all()
    
    # Count by type
    by_type = {}
    for alert in alerts:
        alert_type = alert.alert_type
        by_type[alert_type] = by_type.get(alert_type, 0) + 1
    
    # Count by severity
    by_severity = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for alert in alerts:
        if alert.severity in by_severity:
            by_severity[alert.severity] += 1
    
    # Resolution rate
    resolved_count = sum(1 for a in alerts if a.resolved)
    resolution_rate = (resolved_count / len(alerts) * 100) if alerts else 100
    
    return {
        "total_alerts": len(alerts),
        "by_type": by_type,
        "by_severity": by_severity,
        "resolved": resolved_count,
        "unresolved": len(alerts) - resolved_count,
        "resolution_rate": round(resolution_rate, 1),
        "period_days": days
    }


@router.get("/behavior-baseline")
async def get_behavior_baseline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's behavior baseline for risk analysis"""
    baseline_service = BehaviorBaselineService(db)
    baseline = baseline_service.get_baseline(current_user.user_id)
    
    if not baseline:
        raise HTTPException(status_code=404, detail="Baseline not computed yet")
    
    return baseline


@router.post("/recompute-baseline")
async def recompute_baseline(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Force recomputation of behavior baseline"""
    baseline_service = BehaviorBaselineService(db)
    baseline = baseline_service.compute_baseline(current_user.user_id)
    
    if not baseline:
        raise HTTPException(status_code=500, detail="Failed to compute baseline")
    
    return {
        "message": "Baseline recomputed",
        "baseline": baseline.to_dict()
    }
