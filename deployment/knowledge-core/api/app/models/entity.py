from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..database import Base


class Entity(Base):
    __tablename__ = "entities"
    __table_args__ = {"schema": "knowledge"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)  # References core.brands.id
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)  # product | person | award | stat | policy
    category = Column(String(100))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    facts = relationship("Fact", back_populates="entity", cascade="all, delete-orphan")
