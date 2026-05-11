from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class Fact(Base):
    __tablename__ = "facts"
    __table_args__ = {"schema": "knowledge"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_id = Column(UUID(as_uuid=True), ForeignKey("knowledge.entities.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)  # References core.brands.id
    attribute = Column(String(255), nullable=False)
    value = Column(Text, nullable=False)
    unit = Column(String(50))
    confidence = Column(Float, default=0.8)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String(255))
    source_url = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    entity = relationship("Entity", back_populates="facts")
