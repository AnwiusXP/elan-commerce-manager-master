"""
Script de migración: Crear tablas 'pedidos' y 'pedido_items' para el Módulo 4.
Ejecutar: python migrate_pedidos.py
"""
from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Tabla pedidos
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pedidos (
                id SERIAL PRIMARY KEY,
                guia_rastreo VARCHAR UNIQUE NOT NULL,
                cliente_nombre VARCHAR NOT NULL,
                cliente_telefono VARCHAR NOT NULL,
                cliente_direccion VARCHAR NOT NULL,
                cliente_ciudad VARCHAR NOT NULL,
                cliente_email VARCHAR,
                nequi_celular VARCHAR NOT NULL,
                total FLOAT NOT NULL,
                estado VARCHAR DEFAULT 'PENDIENTE_NEQUI',
                fecha_creacion TIMESTAMP DEFAULT NOW(),
                fecha_actualizacion TIMESTAMP DEFAULT NOW()
            )
        """))
        
        # Índices
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pedidos_guia_rastreo ON pedidos (guia_rastreo)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pedidos_estado ON pedidos (estado)
        """))

        # Tabla pedido_items
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pedido_items (
                id SERIAL PRIMARY KEY,
                pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
                producto_id INTEGER NOT NULL REFERENCES productos(id),
                nombre_producto VARCHAR NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_unitario FLOAT NOT NULL,
                subtotal FLOAT NOT NULL
            )
        """))
        
        # Índices
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pedido_items_pedido_id ON pedido_items (pedido_id)
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_pedido_items_producto_id ON pedido_items (producto_id)
        """))
        
        conn.commit()
        print("✅ Migración completada: tablas 'pedidos' y 'pedido_items' creadas.")

if __name__ == "__main__":
    migrate()
