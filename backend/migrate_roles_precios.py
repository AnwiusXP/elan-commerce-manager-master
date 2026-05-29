from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # 1. Actualizar tabla usuarios (roles)
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS rol VARCHAR DEFAULT 'cliente_base';"))
        
        # Asegurar que el administrador existente tenga el rol admin
        conn.execute(text("UPDATE users SET rol = 'admin' WHERE username = 'admin';"))
        
        # 2. Actualizar tabla productos (precios dinámicos)
        conn.execute(text("ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_base FLOAT DEFAULT 0.0;"))
        conn.execute(text("ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_distribuidor FLOAT DEFAULT 0.0;"))
        
        # Sincronizar precios base iniciales con el precio legacy existente
        conn.execute(text("UPDATE productos SET precio_base = precio WHERE precio_base = 0.0;"))
        conn.execute(text("UPDATE productos SET precio_distribuidor = precio WHERE precio_distribuidor = 0.0;"))
        
        conn.commit()
        print("✅ Migración completada exitosamente.")

if __name__ == "__main__":
    migrate()
