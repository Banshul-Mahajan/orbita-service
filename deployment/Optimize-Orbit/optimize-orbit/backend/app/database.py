from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)


# Set search_path to optimize schema for every new connection
@event.listens_for(engine, "connect")
def set_search_path(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute(f"SET search_path TO {settings.DB_SCHEMA}, core, public")
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
    """Create optimize schema and tables."""
    with engine.connect() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {settings.DB_SCHEMA}"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
