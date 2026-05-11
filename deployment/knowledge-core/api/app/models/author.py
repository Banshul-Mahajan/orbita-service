from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from ..database import Base


class AuthorProfile(Base):
    __tablename__ = "author_profiles"
    __table_args__ = {"schema": "knowledge"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=False), nullable=False, index=True)
    brand_id = Column(UUID(as_uuid=False), nullable=False, index=True)  # References core.brands.id
    name = Column(String(255), nullable=False)
    bio = Column(Text)
    credentials = Column(Text)
    linkedin_url = Column(String(500))
    expertise_areas = Column(JSONB, default=list)
    eeeat_signals = Column(JSONB, default=dict)
    schema_markup = Column(JSONB, default=dict)
    # BUG FIX: was datetime.timezone.utc which fails — now uses func.now()
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
