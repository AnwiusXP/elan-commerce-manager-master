from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:1234@localhost:5432/elan_db")

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token VARCHAR"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMP"))
    conn.execute(text("UPDATE users SET is_active = TRUE WHERE email = 'admin@elan.com'"))
    conn.execute(text("UPDATE users SET is_active = TRUE WHERE is_active IS NULL"))
    conn.commit()

print("Migración completada.")