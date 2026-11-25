"""
Script de Carga de Datos Iniciales (Seed) para Elan Commerce Manager.
Inserta:
1. Las 6 Categorías Oficiales del sistema.
2. Usuarios base (admin, cliente1, distribuidor1) con contraseñas bcrypt.
3. Productos iniciales vinculados a las categorías oficiales con precios base y distribuidor.
Totalmente idempotente: seguro de ejecutar múltiples veces sin duplicar datos.
"""
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal, engine, Base
from models import Categoria, Producto, User
from auth import get_password_hash

CATEGORIAS_OFICIALES = [
    {"nombre": "Ambientación", "slug": "ambientacion", "descripcion": "Ambientadores y aromatizantes de espacios"},
    {"nombre": "Limpieza del Hogar", "slug": "limpieza_hogar", "descripcion": "Productos de limpieza general para el hogar"},
    {"nombre": "Pisos y Superficies", "slug": "pisos_superficies", "descripcion": "Limpiadores, ceras y desengrasantes de superficies"},
    {"nombre": "Lavado de Ropa", "slug": "lavado_ropa", "descripcion": "Detergentes, suavizantes y blanqueadores"},
    {"nombre": "Higiene Personal", "slug": "higiene_personal", "descripcion": "Jabones, geles y cuidado corporal"},
    {"nombre": "Solventes e Industriales", "slug": "solventes_industriales", "descripcion": "Alcoholes, solventes y químicos industriales"},
]

USUARIOS_INICIALES = [
    {"username": "admin", "email": "admin@elan.com", "password": "1234", "rol": "admin", "is_active": True},
    {"username": "cliente1", "email": "cliente1@elan.com", "password": "1234", "rol": "cliente_base", "is_active": True},
    {"username": "distribuidor1", "email": "distribuidor1@elan.com", "password": "1234", "rol": "distribuidor", "is_active": True},
]

PRODUCTOS_INICIALES = [
    {
        "nombre": "Ambientador Lavanda 500ml",
        "slug_cat": "ambientacion",
        "precio_base": 25000.0,
        "precio_distribuidor": 20000.0,
        "stock": 50,
        "stockMin": 10
    },
    {
        "nombre": "Detergente Líquido Ropa 3L",
        "slug_cat": "lavado_ropa",
        "precio_base": 38000.0,
        "precio_distribuidor": 30000.0,
        "stock": 35,
        "stockMin": 10
    },
    {
        "nombre": "Desengrasante Multiusos 1L",
        "slug_cat": "limpieza_hogar",
        "precio_base": 18000.0,
        "precio_distribuidor": 14000.0,
        "stock": 60,
        "stockMin": 10
    },
    {
        "nombre": "Limpiador de Pisos Lavanda 2L",
        "slug_cat": "pisos_superficies",
        "precio_base": 16000.0,
        "precio_distribuidor": 12000.0,
        "stock": 40,
        "stockMin": 10
    },
    {
        "nombre": "Gel Antibacterial 1L con Dosificador",
        "slug_cat": "higiene_personal",
        "precio_base": 22000.0,
        "precio_distribuidor": 17000.0,
        "stock": 45,
        "stockMin": 10
    },
    {
        "nombre": "Alcohol Isopropílico 99% 1L",
        "slug_cat": "solventes_industriales",
        "precio_base": 28000.0,
        "precio_distribuidor": 22000.0,
        "stock": 25,
        "stockMin": 10
    },
]

def seed():
    db = SessionLocal()
    try:
        # 1. Categorías oficiales
        print("\n [SEED] 1. Verificando categorías oficiales...")
        cat_map = {}
        for cat_data in CATEGORIAS_OFICIALES:
            cat = db.query(Categoria).filter(
                (Categoria.slug == cat_data["slug"]) | (Categoria.nombre == cat_data["nombre"])
            ).first()
            if not cat:
                cat = Categoria(
                    nombre=cat_data["nombre"],
                    slug=cat_data["slug"],
                    descripcion=cat_data["descripcion"]
                )
                db.add(cat)
                db.flush()
                print(f"   [+] Creada categoría: {cat.nombre} (slug: {cat.slug}, id: {cat.id})")
            else:
                cat_map[cat.slug] = cat.id
                print(f"   [-] Ya existe categoría: {cat.nombre} (id: {cat.id})")
            cat_map[cat.slug] = cat.id
        db.commit()

        # 2. Usuarios
        print("\n [SEED] 2. Verificando usuarios iniciales...")
        for u_data in USUARIOS_INICIALES:
            user = db.query(User).filter(
                (User.username == u_data["username"]) | (User.email == u_data["email"])
            ).first()
            if not user:
                user = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    hashed_password=get_password_hash(u_data["password"]),
                    rol=u_data["rol"],
                    is_active=u_data["is_active"]
                )
                db.add(user)
                db.flush()
                print(f"   [+] Creado usuario: {user.username} / {u_data['password']} (rol: {user.rol})")
            else:
                # Asegurar rol y activación
                user.rol = u_data["rol"]
                user.is_active = True
                print(f"   [-] Ya existe usuario: {user.username} (rol: {user.rol})")
        db.commit()

        # 3. Productos
        print("\n [SEED] 3. Verificando productos de prueba...")
        for p_data in PRODUCTOS_INICIALES:
            prod = db.query(Producto).filter(Producto.nombre == p_data["nombre"]).first()
            cat_id = cat_map.get(p_data["slug_cat"])
            cat_obj = db.query(Categoria).filter(Categoria.id == cat_id).first()
            cat_nombre = cat_obj.nombre if cat_obj else "General"

            if not prod:
                prod = Producto(
                    nombre=p_data["nombre"],
                    categoria=cat_nombre,
                    categoria_id=cat_id,
                    precio=p_data["precio_base"],
                    precio_base=p_data["precio_base"],
                    precio_distribuidor=p_data["precio_distribuidor"],
                    stock=p_data["stock"],
                    stockMin=p_data["stockMin"]
                )
                db.add(prod)
                print(f"   [+] Creado producto: {prod.nombre} (${prod.precio_base} / cat: {cat_nombre})")
            else:
                prod.categoria_id = cat_id
                prod.precio_base = p_data["precio_base"]
                prod.precio_distribuidor = p_data["precio_distribuidor"]
                print(f"   [-] Ya existe producto: {prod.nombre} (actualizado categoria_id={cat_id})")
        db.commit()

        print("\n [SEED] ✅ Carga de datos completada exitosamente.")

    except Exception as e:
        db.rollback()
        print(f"\n [SEED] ❌ Error durante el seed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
