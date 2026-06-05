from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)


# Set search_path to 'core' schema for every new connection
@event.listens_for(engine, "connect")
def set_search_path(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET search_path TO core, public")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """Create core schema and all tables. Safe for MVP startup."""
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS core"))
        conn.commit()
    Base.metadata.create_all(bind=engine)

    # Lightweight, idempotent migrations for columns added after a table was
    # first created. create_all() never ALTERs existing tables, so any new
    # optional columns are added here. Safe to run on every startup.
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE core.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)"))
        conn.execute(text("ALTER TABLE core.users ADD COLUMN IF NOT EXISTS designation VARCHAR(150)"))
        conn.execute(text("ALTER TABLE core.users ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500)"))
        conn.commit()
