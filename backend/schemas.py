# backend/schemas.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class SessionBase(BaseModel):
    title: str
    system: str
    players: str

class SessionCreate(SessionBase):
    # 任意で日付を指定できるように（未指定ならDB側のdefaultが使われる）
    date: Optional[datetime] = None

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    system: Optional[str] = None
    players: Optional[str] = None
    date: Optional[datetime] = None

class Session(SessionBase):
    id: int
    date: datetime
    # Pydantic v2: orm_mode → from_attributes
    model_config = {"from_attributes": True}

class PagedSessions(BaseModel):
    items: List[Session]
    total: int