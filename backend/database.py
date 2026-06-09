import os
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Cargar .env con codificación UTF-8 para caracteres especiales (ñ, acentos, etc.)
from dotenv import load_dotenv
load_dotenv(encoding="utf-8")

# 1. Leer variable de entorno (Render inyecta DATABASE_URL)
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Fallback condicional: SQLite para desarrollo local ligero
#    Se activa cuando NO existe DATABASE_URL Y (ENVIRONMENT=development O LOCAL_DB=sqlite)
if not DATABASE_URL:
    ENV = os.getenv("ENVIRONMENT", "")
    LOCAL_DB_FLAG = os.getenv("LOCAL_DB", "")
    USE_SQLITE = ENV.lower() == "development" or LOCAL_DB_FLAG.lower() == "sqlite"

    if USE_SQLITE:
        DATABASE_URL = "sqlite:///./elan_dev.db"
        print(" [DB] Usando SQLite local (desarrollo ligero)")
    else:
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

# 4. Mostrar a qué BD nos conectamos (soporta SQLite y PostgreSQL)
if DATABASE_URL.startswith("sqlite"):
    db_file = DATABASE_URL.replace("sqlite:///", "")
    print(f" [DB] Conectando a BD: SQLite local ({db_file})")
elif "@" in DATABASE_URL:
    print(f" [DB] Conectando a BD: {DATABASE_URL.split('@')[-1]}")
else:
    print(f" [DB] Conectando a BD: {DATABASE_URL}")

# 5. Crear engine con connect_args condicional para SQLite (multi-thread)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
except Exception as e:
    print(f" [DB] ERROR CRITICO al crear el engine de BD: {e}")
    print(f" [DB] DATABASE_URL usada: {DATABASE_URL}")
    raise
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()