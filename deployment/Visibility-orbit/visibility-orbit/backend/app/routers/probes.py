from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import ProbePrompt, ProbeRun, LLMEngine, ProbeStatus
from app.schemas import RunProbeRequest, ProbeRunOut, DashboardStats
from app.core.deps import CurrentUser, get_current_user
from app.core.platform import get_brand_or_404, get_request_project_id, get_request_token
from app.services.probe_engine import execute_probe_run

router = APIRouter(prefix="/brands", tags=["probes"])


@router.post("/{brand_id}/probes/run")
def run_probes(
    brand_id: str,
    payload: RunProbeRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Trigger probe runs for selected prompts × engines.
    Runs are created immediately and processed in background.
    Returns the list of run IDs created.
    """
    brand = get_brand_or_404(request, current_user, brand_id)
    project_id = get_request_project_id(request)
    user_token = get_request_token(request)

    # Validate engines
    valid_engines = [e.value for e in LLMEngine]
    for engine in payload.engines:
        if engine not in valid_engines:
            raise HTTPException(status_code=400, detail=f"Invalid engine: {engine}")

    # Fetch selected prompts
    prompts = db.query(ProbePrompt).filter(
        ProbePrompt.id.in_(payload.prompt_ids),
        ProbePrompt.organization_id == current_user.org_id,
        ProbePrompt.brand_id == brand_id,
        ProbePrompt.is_active == True,
    ).all()

    if not prompts:
        raise HTTPException(status_code=400, detail="No valid prompts found")

    run_ids = []

    # Create all run records first (so frontend can poll them)
    for prompt in prompts:
        for engine in payload.engines:
            run = ProbeRun(
                organization_id=current_user.org_id,
                brand_id=brand_id,
                project_id=project_id,
                prompt_id=prompt.id,
                llm_engine=LLMEngine(engine),
                status=ProbeStatus.pending,
                prompt_text=prompt.prompt_text,
            )
            db.add(run)
            db.flush()
            run_ids.append(run.id)

    db.commit()

    # Queue background execution for each run
    for run_id in run_ids:
        background_tasks.add_task(
            execute_probe_run,
            db=SessionLocal(),
            run_id=run_id,
            brand_name=brand["name"],
            user_token=user_token,
        )

    return {"run_ids": run_ids, "total": len(run_ids)}


@router.get("/{brand_id}/probes", response_model=List[ProbeRunOut])
def list_probe_runs(
    brand_id: str,
    request: Request,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    return (
        db.query(ProbeRun)
        .filter(
            ProbeRun.organization_id == current_user.org_id,
            ProbeRun.brand_id == brand_id,
        )
        .order_by(ProbeRun.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/{brand_id}/probes/{run_id}", response_model=ProbeRunOut)
def get_probe_run(
    brand_id: str,
    run_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    get_brand_or_404(request, current_user, brand_id)
    run = db.query(ProbeRun).filter(
        ProbeRun.id == run_id,
        ProbeRun.organization_id == current_user.org_id,
        ProbeRun.brand_id == brand_id,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Probe run not found")
    return run


@router.get("/{brand_id}/dashboard", response_model=DashboardStats)
def dashboard_stats(
    brand_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from app.models import Alert, AlertType
    get_brand_or_404(request, current_user, brand_id)

    total_probes = db.query(ProbeRun).filter(
        ProbeRun.organization_id == current_user.org_id,
        ProbeRun.brand_id == brand_id,
        ProbeRun.status == ProbeStatus.completed,
    ).count()

    alerts = db.query(Alert).filter(
        Alert.organization_id == current_user.org_id,
        Alert.brand_id == brand_id,
    ).all()
    unresolved = [a for a in alerts if not a.resolved]
    hallucinations = [a for a in alerts if a.alert_type == AlertType.hallucination]

    # Average sentiment from completed runs
    completed_runs = db.query(ProbeRun).filter(
        ProbeRun.organization_id == current_user.org_id,
        ProbeRun.brand_id == brand_id,
        ProbeRun.status == ProbeStatus.completed,
        ProbeRun.parsed_result.isnot(None),
    ).all()

    sentiment_scores = [
        r.parsed_result.get("sentiment_score", 0.0)
        for r in completed_runs
        if r.parsed_result
    ]
    avg_sentiment = (
        round(sum(sentiment_scores) / len(sentiment_scores), 2)
        if sentiment_scores else None
    )

    engines_used = list({r.llm_engine.value for r in completed_runs})

    return DashboardStats(
        total_probes=total_probes,
        total_alerts=len(alerts),
        unresolved_alerts=len(unresolved),
        hallucinations_detected=len(hallucinations),
        avg_sentiment=avg_sentiment,
        engines_tested=engines_used,
    )


# Need a separate db session for background tasks
from app.database import SessionLocal
