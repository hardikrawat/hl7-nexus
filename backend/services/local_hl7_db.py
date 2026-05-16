from __future__ import annotations

import re
import sqlite3
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
DEFAULT_DB_PATH = DATA_DIR / "hl7_messages.db"
DEFAULT_TABLE = "hl7_messages"
MAX_ROWS = 500

SAMPLE_ROWS = [
    {
        "id": "DB_001",
        "type": "ADT^A01",
        "patient": "DOE, JOHN",
        "received_at": "2026-05-11 08:12",
        "message": "MSH|^~\\&|LOCAL_DB|HOSPITAL|HELIX|NEXUS|202605110812||ADT^A01|DB001|P|2.5.1\nPID|1||12345||DOE^JOHN||19800101|M\nPV1|1|I|WARD^101^A",
    },
    {
        "id": "DB_002",
        "type": "ORU^R01",
        "patient": "SMITH, ANNA",
        "received_at": "2026-05-11 08:34",
        "message": "MSH|^~\\&|LAB|HOSPITAL|HELIX|NEXUS|202605110834||ORU^R01|DB002|P|2.5.1\nPID|1||67890||SMITH^ANNA||19751202|F\nOBR|1||LAB123|CBC^Complete Blood Count\nOBX|1|NM|WBC^White Blood Count||6.7|10*3/uL",
    },
    {
        "id": "DB_003",
        "type": "ORM^O01",
        "patient": "PATEL, RAVI",
        "received_at": "2026-05-11 09:03",
        "message": "MSH|^~\\&|ORDER_ENTRY|CLINIC|HELIX|NEXUS|202605110903||ORM^O01|DB003|P|2.5.1\nPID|1||24680||PATEL^RAVI||19920314|M\nORC|NW|ORD4488\nOBR|1|ORD4488||XRAYCHEST^Chest X-Ray",
    },
]


class LocalHl7DbError(ValueError):
    pass


def init_local_hl7_db(db_path: Path = DEFAULT_DB_PATH) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {DEFAULT_TABLE} (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                patient TEXT NOT NULL,
                received_at TEXT NOT NULL,
                message TEXT NOT NULL
            )
            """
        )
        conn.executemany(
            f"""
            INSERT OR IGNORE INTO {DEFAULT_TABLE}
                (id, type, patient, received_at, message)
            VALUES
                (:id, :type, :patient, :received_at, :message)
            """,
            SAMPLE_ROWS,
        )
        conn.commit()
    return db_path


def resolve_db_path(connection: str | None) -> Path:
    raw = (connection or "").strip() or "./data/hl7_messages.db"
    if raw in {"./data/hl7_messages.db", "data/hl7_messages.db", "hl7_messages.db"}:
        return DEFAULT_DB_PATH

    candidate = Path(raw).expanduser()
    if candidate.is_absolute():
        resolved = candidate.resolve()
    else:
        parts = candidate.parts
        if parts and parts[0] in {".", "data"}:
            parts = parts[1:]
        resolved = (DATA_DIR / Path(*parts)).resolve()

    data_root = DATA_DIR.resolve()
    if resolved != data_root and data_root not in resolved.parents:
        raise LocalHl7DbError("SQLite connection must point to a file inside backend/data.")
    return resolved


def quote_identifier(identifier: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", identifier or ""):
        raise LocalHl7DbError("Table name must use letters, numbers, and underscores only.")
    return f'"{identifier}"'


def list_hl7_messages(
    *,
    connection: str | None,
    table: str | None,
    limit: int = MAX_ROWS,
) -> tuple[list[dict[str, Any]], Path]:
    db_path = resolve_db_path(connection)
    table_name = table or DEFAULT_TABLE
    quoted_table = quote_identifier(table_name)

    if db_path == DEFAULT_DB_PATH:
        init_local_hl7_db(db_path)
    elif not db_path.exists():
        raise LocalHl7DbError(f"SQLite database was not found: {db_path}")

    row_limit = min(max(int(limit), 1), MAX_ROWS)
    try:
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                f"""
                SELECT id, type, patient, received_at, message
                FROM {quoted_table}
                ORDER BY received_at ASC, id ASC
                LIMIT ?
                """,
                (row_limit,),
            ).fetchall()
    except sqlite3.Error as exc:
        raise LocalHl7DbError(str(exc)) from exc

    items = [
        {
            "id": row["id"],
            "type": row["type"],
            "patient": row["patient"],
            "receivedAt": row["received_at"],
            "message": row["message"],
        }
        for row in rows
    ]
    return items, db_path
