from datetime import datetime
from pydantic import BaseModel

class SessionBase(BaseModel):
    title: str
    system: str
    players: str

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    id: int
    date: datetime

    class Config:
        orm_mode = True