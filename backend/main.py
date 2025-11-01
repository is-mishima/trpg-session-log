# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, asc, desc
from typing import Optional

import models, schemas, database

# DB初期化
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# CORS設定（フロントとの通信許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# DBセッション管理
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Healthチェック
@app.get("/health")
def health():
    return {"ok": True}

# --------------------
# CRUDエンドポイント
# --------------------

# ✅ Create
@app.post("/sessions", response_model=schemas.Session)
def create_session(session: schemas.SessionCreate, db: Session = Depends(get_db)):
    payload = session.dict(exclude_unset=True)
    obj = models.SessionRecord(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

# ✅ Read（検索 / ソート / ページング対応）
@app.get("/sessions", response_model=schemas.PagedSessions)
def read_sessions(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="あいまい検索（title/system/players）"),
    sort_by: str = Query("date"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    # バリデーション
    allowed_sort = {"id", "title", "system", "date"}
    if sort_by not in allowed_sort:
        raise HTTPException(status_code=400, detail=f"sort_by must be one of {sorted(allowed_sort)}")

    allowed_order = {"asc", "desc"}
    if order not in allowed_order:
        raise HTTPException(status_code=400, detail=f"order must be one of {sorted(allowed_order)}")

    query = db.query(models.SessionRecord)

    # 検索
    if q:
        ilike = f"%{q}%"
        query = query.filter(
            or_(
                models.SessionRecord.title.ilike(ilike),
                models.SessionRecord.system.ilike(ilike),
                models.SessionRecord.players.ilike(ilike),
            )
        )

    total = query.count()

    # ソート
    col = getattr(models.SessionRecord, sort_by)
    query = query.order_by(asc(col) if order == "asc" else desc(col))

    # ページング
    items = query.offset((page - 1) * limit).limit(limit).all()
    return {"items": items, "total": total}

# ✅ Update
@app.patch("/sessions/{session_id}", response_model=schemas.Session)
def update_session(session_id: int, patch: schemas.SessionUpdate, db: Session = Depends(get_db)):
    obj = db.query(models.SessionRecord).get(session_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Session not found")

    for k, v in patch.dict(exclude_unset=True).items():
        setattr(obj, k, v)

    db.commit()
    db.refresh(obj)
    return obj

# ✅ Delete
@app.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: int, db: Session = Depends(get_db)):
    obj = db.query(models.SessionRecord).get(session_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(obj)
    db.commit()
    return

