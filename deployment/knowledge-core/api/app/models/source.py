from sqlalchemy import Column, String, Float, DateTime, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from ..database import Base


class Source(Base):
    __tablename__ = "sources"
    __table_args__ = {"schema": "knowledge"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)  # References core.brands.id
    url = Column(Text, nullable=False)
    title = Column(String(500))
    domain = Column(String(255))
    source_type = Column(String(50), default="website")  # website | paper | gov | internal | news
    reliability_score = Column(Integer, default=3)  # 1-5
    is_active = Column(Boolean, default=True)
    fetched_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
