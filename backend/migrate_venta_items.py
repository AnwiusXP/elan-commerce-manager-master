"""
Migración: Crear tabla venta_items y poblar con datos históricos
================================================================
1. Crea la tabla 'venta_items' si no existe.
2. Lee todas las ventas APROBADAS existentes.
3. Parsea el JSON de 'items' y crea registros normalizados en 'venta_items'.
4. Esto permite cálculos dinámicos de unidades vendidas por producto via FK.

Ejecutar: python migrate_venta_items.py
"""

import json
from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:1234@localhost:5432/elan_db")

with engine.connect() as conn:
    # ================================================================
    # FASE 1 — Crear tabla venta_items
    # ================================================================
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS venta_items (
            id SERIAL PRIMARY KEY,
            venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
            producto_id INTEGER NOT NULL REFERENCES productos(id),
            nombre_producto VARCHAR NOT NULL,
            cantidad INTEGER NOT NULL,
            precio_unitario FLOAT NOT NULL,
            subtotal FLOAT NOT NULL
        )
    """))
    print("[1/4] Tabla 'venta_items' creada (o ya existía).")

    # Crear índices
    conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_venta_items_venta_id') THEN
                CREATE INDEX ix_venta_items_venta_id ON venta_items (venta_id);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_venta_items_producto_id') THEN
                CREATE INDEX ix_venta_items_producto_id ON venta_items (producto_id);
            END IF;
        END $$;
    """))
    print("[2/4] Índices creados en 'venta_items'.")

    # Crear índice en ventas.estado si no existe
    conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_ventas_estado') THEN
                CREATE INDEX ix_ventas_estado ON ventas (estado);
            END IF;
        END $$;
    """))
    print("[3/4] Índice en 'ventas.estado' creado.")

    # ================================================================
    # FASE 2 — Poblar venta_items desde datos históricos de ventas
    # ================================================================
    # Verificar si ya hay datos para no duplicar
    existing_count = conn.execute(text("SELECT COUNT(*) FROM venta_items")).scalar()
    if existing_count > 0:
        print(f"    ⚠️  Ya hay {existing_count} registros en venta_items. Saltando población.")
    else:
        ventas = conn.execute(text(
            "SELECT id, items FROM ventas WHERE estado = 'APROBADA' AND items IS NOT NULL"
        )).fetchall()

        items_insertados = 0
        for venta_id, items_json in ventas:
            try:
                items = json.loads(items_json)
                for item in items:
                    conn.execute(text("""
                        INSERT INTO venta_items (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
                        VALUES (:venta_id, :producto_id, :nombre, :cantidad, :precio, :subtotal)
                    """), {
                        "venta_id": venta_id,
                        "producto_id": item.get("producto_id"),
                        "nombre": item.get("nombre_producto", "Sin nombre"),
                        "cantidad": item.get("cantidad", 0),
                        "precio": item.get("precio", 0),
                        "subtotal": item.get("precio", 0) * item.get("cantidad", 0),
                    })
                    items_insertados += 1
            except (json.JSONDecodeError, KeyError) as e:
                print(f"    ⚠️  Error procesando venta #{venta_id}: {e}")

        print(f"    ✅ {items_insertados} registros insertados en venta_items desde {len(ventas)} ventas.")

    conn.commit()
    print("[4/4] ✅ Migración completada exitosamente.")

    # Verificación
    total = conn.execute(text("SELECT COUNT(*) FROM venta_items")).scalar()
    print(f"\n--- Verificación: {total} registros totales en venta_items ---")
