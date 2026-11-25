"""
Script de migración idempotente para agregar columnas de facturación a la tabla ventas.
Compatible con PostgreSQL y SQLite.
"""
import os
import sys
from sqlalchemy import text, inspect

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import engine

NUEVAS_COLUMNAS = [
    ("cliente_nombre", "VARCHAR"),
    ("cliente_documento", "VARCHAR"),
    ("cliente_tipo_doc", "VARCHAR DEFAULT 'CC'"),
    ("cliente_email", "VARCHAR"),
    ("cliente_telefono", "VARCHAR"),
    ("cliente_direccion", "VARCHAR"),
    ("cliente_ciudad", "VARCHAR"),
    ("origen_venta", "VARCHAR DEFAULT 'WEB'"),
]

def migrate_facturas():
    print(" [MIGRACION] Iniciando migración de columnas de facturación para tabla ventas...")
    inspector = inspect(engine)
    existing_columns = [col["name"] for col in inspector.get_columns("ventas")]
    print(f" [MIGRACION] Columnas actuales en ventas: {existing_columns}")

    with engine.connect() as conn:
        for col_name, col_type in NUEVAS_COLUMNAS:
            if col_name not in existing_columns:
                print(f" [MIGRACION] Agregando columna '{col_name}'...")
                sql = f"ALTER TABLE ventas ADD COLUMN {col_name} {col_type}"
                conn.execute(text(sql))
            else:
                print(f" [MIGRACION] Columna '{col_name}' ya existe. Omitiendo.")
        conn.commit()
    print(" [MIGRACION] ✅ Columnas de facturación verificadas/migradas exitosamente.")

if __name__ == "__main__":
    migrate_facturas()
