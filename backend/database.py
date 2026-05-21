import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Cargar .env con codificación UTF-8 para caracteres especiales (ñ, acentos, etc.)
from dotenv import load_dotenv
load_dotenv(encoding="utf-8")

# 1. Leer variable de entorno (Render injecta DATABASE_URL)
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Fallback: si no existe, usar PostgreSQL local
# IMPORTANTE: Cambia las credenciales locales si son diferentes
if not DATABASE_URL:
    LOCAL_DB_URL = os.getenv(
        "LOCAL_DATABASE_URL",
        "postgresql://user_elan:password_elan@localhost:5432/elan_db"
    )
    # URL-encode de componentes de conexión para caracteres especiales
    if "@" in LOCAL_DB_URL:
        protocolo_y_resto = LOCAL_DB_URL.split("://")[0] + "://"
        resto = LOCAL_DB_URL.split("://")[1]
        if "@" in resto:
            credenciales, host_db = resto.split("@", 1)
            if ":" in credenciales:
                user, password = credenciales.split(":", 1)
                password_encoded = quote_plus(password)
                LOCAL_DB_URL = f"{protocolo_y_resto}{user}:{password_encoded}@{host_db}"
    DATABASE_URL = LOCAL_DB_URL

# 3. Corrección de prefijo para SQLAlchemy 1.4+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f" 🔌 Conectando a BD: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'URL inválida'}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()