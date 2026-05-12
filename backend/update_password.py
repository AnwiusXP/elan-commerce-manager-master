"""
Script para migrar la contraseña del usuario ID 3 al nuevo sistema bcrypt.
Ejecutar una sola vez: py update_password.py
"""
from database import SessionLocal
from models import User
from auth import get_password_hash

db = SessionLocal()

user = db.query(User).filter(User.id == 3).first()
if user:
    user.hashed_password = get_password_hash("1234")
    db.commit()
    print(f"✅ Contraseña de '{user.email}' (ID {user.id}) actualizada a bcrypt.")
    print(f"   Nuevo hash: {user.hashed_password[:20]}...")
else:
    print("❌ No se encontró el usuario con ID 3.")

db.close()
