"""
Script de migración idempotente: Sincronización de esquema para Elan Commerce Manager.
Alinea PostgreSQL con los modelos SQLAlchemy (Producto, User, Venta).
Compatible con Docker, desarrollo local y despliegue en Render.
"""
import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import engine

STATEMENTS = [
    # 1. Columnas de productos
    "ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria_id INTEGER",
    "ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_base DOUBLE PRECISION DEFAULT 0.0 NOT NULL",
    "ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_distribuidor DOUBLE PRECISION DEFAULT 0.0 NOT NULL",

    # 2. FK categoria_id -> categorias.id
    """
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'productos_categoria_id_fkey'
        ) THEN
            ALTER TABLE productos
            ADD CONSTRAINT productos_categoria_id_fkey
            FOREIGN KEY (categoria_id) REFERENCES categorias(id);
        END IF;
    END $$
    """,

    # 3. Índice en categoria_id
    "CREATE INDEX IF NOT EXISTS ix_productos_categoria_id ON productos (categoria_id)",

    # 4. Columna rol en users
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS rol VARCHAR DEFAULT 'cliente_base' NOT NULL",

    # 5. Índice de estado en ventas
    "CREATE INDEX IF NOT EXISTS ix_ventas_estado ON ventas (estado)",

    # 6. Sincronizar precios legacy
    "UPDATE productos SET precio_base = precio WHERE precio_base = 0.0 AND precio IS NOT NULL",
    "UPDATE productos SET precio_distribuidor = precio WHERE precio_distribuidor = 0.0 AND precio IS NOT NULL",

    # 7. Columnas de facturación y cliente en ventas (Facturación DIAN / Ventas Externas)
    "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR",
    "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_documento VARCHAR",
    "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_tipo_doc VARCHAR DEFAULT 'CC'",
    "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_email VARCHAR",
    "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR",
    "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_direccion VARCHAR",
    "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_ciudad VARCHAR",
    "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS origen_venta VARCHAR DEFAULT 'WEB'",
]

def sync_schema():
    print(" [MIGRACION] Sincronizando esquema de base de datos...")
    with engine.connect() as conn:
        for stmt in STATEMENTS:
            clean_stmt = stmt.strip()
            if clean_stmt:
                conn.execute(text(clean_stmt))
        conn.commit()
    print(" [MIGRACION] ✅ Esquema sincronizado exitosamente.")

if __name__ == "__main__":
    sync_schema()
