import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Intentar obtener la URL de Render, si no, usar la local
db_url = os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URL")

if not db_url or not db_url.startswith("postgres"):
    db_url = "postgresql://postgres:1234@localhost:5432/elan_db"

# Corrección de prefijo obligatoria para SQLAlchemy >= 1.4
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()