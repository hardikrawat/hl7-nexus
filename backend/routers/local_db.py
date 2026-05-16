from fastapi import APIRouter, Depends, HTTPException, Query

from deps import get_current_username
from services.local_hl7_db import DEFAULT_TABLE, LocalHl7DbError, list_hl7_messages


router = APIRouter()


@router.get("/hl7-messages")
async def get_hl7_messages(
    username: str = Depends(get_current_username),
    driver: str = Query("SQLite"),
    connection: str = Query("./data/hl7_messages.db"),
    table: str = Query(DEFAULT_TABLE),
    limit: int = Query(100, ge=1, le=500),
):
    if driver.lower() != "sqlite":
        raise HTTPException(status_code=400, detail="Only SQLite is supported for local HL7 database source.")

    try:
        items, db_path = list_hl7_messages(
            connection=connection,
            table=table,
            limit=limit,
        )
    except LocalHl7DbError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "driver": "SQLite",
        "connection": str(db_path),
        "table": table,
        "items": items,
        "total": len(items),
    }
