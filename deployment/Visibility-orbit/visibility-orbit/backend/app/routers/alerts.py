from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Alert
from app.schemas import AlertOut
from app.core.deps import CurrentUser, get_current_user
from app.core.platform import get_brand_or_404

router = APIRouter(prefix="/brands", tags=["alerts"])


@router.get("/{brand_id}/alerts", response_model=List[AlertOut])
def list_alerts(
    brand_id: str,
    request: Request,
    resolved: bool = False,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)

    query = db.query(Alert).filter(
        Alert.organization_id == current_user.org_id,
        Alert.brand_id == brand_id,
    )
    if not resolved:
        query = query.filter(Alert.resolved == False)
    return query.order_by(Alert.created_at.desc()).limit(100).all()


@router.patch("/{brand_id}/alerts/{alert_id}/resolve")
def resolve_alert(
    brand_id: str,
    alert_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.organization_id == current_user.org_id,
        Alert.brand_id == brand_id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.resolved = True
    db.commit()
    return {"ok": True}
