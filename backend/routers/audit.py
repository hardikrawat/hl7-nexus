from fastapi import APIRouter, Depends, Query

from deps import get_current_username
from services.audit_log import list_audits

router = APIRouter()


@router.get("")
async def get_audit_log(
    username: str = Depends(get_current_username),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_all: bool = Query(
        False,
        description="If true, return every stored row including legacy/system types",
    ),
):
    items, total = await list_audits(
        skip=skip,
        limit=limit,
        user_relevant_only=not include_all,
    )
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "user_relevant_only": not include_all,
    }
