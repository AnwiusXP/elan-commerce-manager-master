import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Intentamos leer la variable de Render
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Si Render no la inyectó o está vacía, forzamos la de producción si estamos en Render, o la local si estamos en tu PC
if not DATABASE_URL:
    # Como última medida si falla la detección, cambia los datos de aquí abajo por los datos de tu BD externa de Render si persiste el fallo
    DATABASE_URL = "postgresql://postgres:1234@localhost:5432/elan_db"

# 3. Corrección obligatoria de prefijo para SQLAlchemy 1.4+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f" Connecting to database... Target string clean.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()