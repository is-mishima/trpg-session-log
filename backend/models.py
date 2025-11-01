from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from database import Base

class SessionRecord(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    system = Column(String)
    players = Column(String)
    date = Column(DateTime, default=datetime.utcnow)