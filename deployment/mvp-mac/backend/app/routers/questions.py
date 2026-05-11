from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.platform import CurrentUser, get_current_user, get_project_context, project_scope_filters
from app.database import get_db
from app.models import Question
from app.schemas import QuestionMineRequest, APIResponse
from app.services.question_service import mine_questions

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("/mine", response_model=APIResponse)
async def mine(
    body: QuestionMineRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, body.project_id, current_user)
    questions = await mine_questions(body.topic)

    # Clear old
    await db.execute(
        delete(Question).where(
            *project_scope_filters(Question, context),
            Question.topic == body.topic,
        )
    )

    for q in questions:
        row = Question(
            organization_id=context.organization_id,
            brand_id=context.brand_id,
            project_id=context.project_id,
            topic=body.topic,
            question_text=q["question_text"],
            source=q["source"],
            q_type=q["q_type"],
        )
        db.add(row)

    # Group by q_type for response
    grouped: dict = {}
    for q in questions:
        qt = q["q_type"]
        grouped.setdefault(qt, []).append(q["question_text"])

    return APIResponse(data={
        "topic": body.topic,
        "total": len(questions),
        "grouped": grouped,
        "all": questions,
    })


@router.get("/{project_id}", response_model=APIResponse)
async def get_questions(
    project_id: str,
    topic: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    context = await get_project_context(request, project_id, current_user)
    result = await db.execute(
        select(Question)
        .where(*project_scope_filters(Question, context), Question.topic == topic)
        .order_by(Question.q_type)
    )
    rows = result.scalars().all()
    grouped: dict = {}
    for r in rows:
        grouped.setdefault(r.q_type, []).append(r.question_text)

    return APIResponse(data={
        "topic": topic,
        "total": len(rows),
        "grouped": grouped,
    })



# backend/app/routers/questions.py — add this route
@router.get("/{project_id}/count", response_model=APIResponse)
async def get_questions_count(
    project_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    from sqlalchemy import func, distinct

    context = await get_project_context(request, project_id, current_user)
    result = await db.execute(
        select(
            func.count(Question.id).label("total_questions"),
            func.count(distinct(Question.topic)).label("total_topics")
        ).where(*project_scope_filters(Question, context))
    )
    row = result.one()
    return APIResponse(data={
        "total_questions": row.total_questions,
        "total_topics": row.total_topics
    })
