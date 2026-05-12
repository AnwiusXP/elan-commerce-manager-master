"""
Migración: Arquitectura de Identidad + Modelo de Ventas
=======================================================
1. Añade columna 'username' a la tabla 'users' (nullable primero).
2. Pobla los registros existentes derivando username del email.
3. Aplica restricciones NOT NULL + UNIQUE + INDEX.
4. Añade columnas de trazabilidad a la tabla 'ventas':
   - user_id (FK a users)
   - metodo_pago
   - estado
   - referencia_pago
"""

from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:1234@localhost:5432/elan_db")

with engine.connect() as conn:
    # ================================================================
    # FASE 1 — Tabla USERS: Columna username
    # ================================================================

    # Paso 1: Agregar columna username (nullable para no romper registros existentes)
    conn.execute(text(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR"
    ))
    print("[1/6] Columna 'username' añadida (nullable).")

    # Paso 2: Poblar username para registros existentes usando la parte antes del @
    # Solo actualiza los que aún no tienen username
    conn.execute(text("""
        UPDATE users
        SET username = SPLIT_PART(email, '@', 1)
        WHERE username IS NULL
    """))
    print("[2/6] Usernames generados a partir de emails existentes.")

    # Paso 3: Resolver colisiones (si hay duplicados, agregar sufijo numérico)
    # Identifica duplicados y resuelve añadiendo un sufijo incremental
    duplicados = conn.execute(text("""
        SELECT username, COUNT(*) as cnt
        FROM users
        GROUP BY username
        HAVING COUNT(*) > 1
    """)).fetchall()

    for dup_username, count in duplicados:
        filas = conn.execute(text(
            "SELECT id FROM users WHERE username = :uname ORDER BY id"
        ), {"uname": dup_username}).fetchall()
        # El primero se queda con el username original, los demás reciben sufijo
        for idx, (user_id,) in enumerate(filas[1:], start=1):
            nuevo_username = f"{dup_username}{idx}"
            conn.execute(text(
                "UPDATE users SET username = :nuevo WHERE id = :uid"
            ), {"nuevo": nuevo_username, "uid": user_id})
            print(f"    Colisión resuelta: user #{user_id} → '{nuevo_username}'")

    print("[3/6] Colisiones de username resueltas.")

    # Paso 4: Aplicar restricciones NOT NULL, UNIQUE e INDEX
    conn.execute(text(
        "ALTER TABLE users ALTER COLUMN username SET NOT NULL"
    ))
    # Crear índice único (IF NOT EXISTS para idempotencia)
    conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_users_username_unique') THEN
                CREATE UNIQUE INDEX ix_users_username_unique ON users (username);
            END IF;
        END $$;
    """))
    print("[4/6] Restricciones NOT NULL + UNIQUE INDEX aplicadas a 'username'.")

    # ================================================================
    # FASE 2 — Tabla VENTAS: Campos de trazabilidad
    # ================================================================

    conn.execute(text(
        "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)"
    ))
    conn.execute(text(
        "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR DEFAULT 'DIRECTO'"
    ))
    conn.execute(text(
        "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado VARCHAR DEFAULT 'APROBADA'"
    ))
    conn.execute(text(
        "ALTER TABLE ventas ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR"
    ))
    print("[5/6] Columnas de trazabilidad añadidas a 'ventas'.")

    conn.commit()
    print("[6/6] ✅ Migración completada exitosamente.")

    # ================================================================
    # VERIFICACIÓN
    # ================================================================
    users = conn.execute(text("SELECT id, username, email FROM users ORDER BY id")).fetchall()
    print("\n--- Usuarios migrados ---")
    for uid, uname, uemail in users:
        print(f"  ID={uid}  username='{uname}'  email='{uemail}'")
