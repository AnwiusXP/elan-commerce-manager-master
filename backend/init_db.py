from database import SessionLocal, engine, Base
from models import User
from auth import get_password_hash

TEST_USERS = [
    {"username": "admin", "password": "1234", "rol": "admin"},
    {"username": "cliente1", "password": "1234", "rol": "cliente_base"},
    {"username": "distribuidor1", "password": "1234", "rol": "distribuidor"},
]

def seed_users():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    for u in TEST_USERS:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            hashed_pw = get_password_hash(u["password"])
            new_user = User(
                username=u["username"],
                email=u["username"],
                hashed_password=hashed_pw,
                rol=u["rol"],
                is_active=True,
            )
            db.add(new_user)
            db.commit()
            print(f"  [+] Usuario creado: {u['username']} / {u['password']} ({u['rol']})")
        else:
            print(f"  - Usuario ya existe: {u['username']}")
    db.close()

if __name__ == "__main__":
    seed_users()
    print("\nUsuarios de prueba listos.")