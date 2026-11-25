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

# Si DATABASE_URL viene con credenciales y la contraseña contiene
# caracteres especiales (acentos, ñ, símbolos), url-encode la contraseña
# para evitar errores de decodificación en psycopg2/libpq.
if DATABASE_URL and "@" in DATABASE_URL and "://" in DATABASE_URL:
    try:
        protocolo_y_resto = DATABASE_URL.split("://")[0] + "://"
        resto = DATABASE_URL.split("://", 1)[1]
        if "@" in resto:
            credenciales, host_db = resto.split("@", 1)
            if ":" in credenciales:
                user, password = credenciales.split(":", 1)
                # quote_plus maneja espacios y caracteres no ASCII
                password_encoded = quote_plus(password)
                DATABASE_URL = f"{protocolo_y_resto}{user}:{password_encoded}@{host_db}"
    except Exception:
        # En caso de fallo, continuar con el valor original y dejar que
        # el bloque de creación del engine reporte el error.
        pass

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

def _build_engine(url):
    return create_engine(url, connect_args=connect_args)

try:
    print(" [DB] DATABASE_URL repr:", repr(DATABASE_URL))
    engine = _build_engine(DATABASE_URL)
except UnicodeDecodeError as e:
    # Mostrar repr para depuración (posibles bytes no-UTF8)
    print(" [DB] UnicodeDecodeError al crear engine:", e)
    try:
        print(" [DB] DATABASE_URL repr:", repr(DATABASE_URL))
    except Exception:
        pass

    # Intento automático: url-encode de la contraseña si hay credenciales
    try:
        if DATABASE_URL and "://" in DATABASE_URL and "@" in DATABASE_URL:
            protocolo = DATABASE_URL.split("://")[0] + "://"
            resto = DATABASE_URL.split("://", 1)[1]
            credenciales, host_db = resto.split("@", 1)
            if ":" in credenciales:
                user, password = credenciales.split(":", 1)
                password_encoded = quote_plus(password)
                fixed = f"{protocolo}{user}:{password_encoded}@{host_db}"
                print(" [DB] Reintentando con contraseña URL-encoded...")
                engine = _build_engine(fixed)
                DATABASE_URL = fixed
            else:
                raise
        else:
            raise
    except Exception as e2:
        print(f" [DB] ERROR CRITICO al crear el engine de BD: {e2}")
        print(f" [DB] DATABASE_URL usada: {DATABASE_URL}")
        raise
except Exception as e:
    print(f" [DB] ERROR CRITICO al crear el engine de BD: {e}")
    print(f" [DB] DATABASE_URL usada: {DATABASE_URL}")
    raise
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()