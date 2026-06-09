"""
Migration script: extract unique categoria strings from Producto
into the new Categoria table and set categoria_id on each product.
Idempotent — safe to run multiple times.
"""
from database import SessionLocal, engine, Base
from models import Producto, Categoria
from sqlalchemy import text as sql_text

# Create the categorias table (safe — only creates if not exists)
Base.metadata.create_all(bind=engine)

# Add categoria_id column to productos if it doesn't exist
with engine.connect() as conn:
    # Check if column exists
    result = conn.execute(sql_text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='productos' AND column_name='categoria_id'"
    ))
    if not result.fetchone():
        print("[migracion] Agregando columna categoria_id a productos...")
        conn.execute(sql_text(
            "ALTER TABLE productos ADD COLUMN categoria_id INTEGER REFERENCES categorias(id)"
        ))
        conn.commit()
        print("[migracion] Columna agregada exitosamente.")
    else:
        print("[migracion] Columna categoria_id ya existe.")

db = SessionLocal()

# 1. Collect unique categoria strings from existing products
nombres_existentes = set()
productos = db.query(Producto).all()
for p in productos:
    if p.categoria:
        nombres_existentes.add(p.categoria.strip().lower())

print(f"[migracion] Categorias unicas detectadas: {nombres_existentes}")

# 2. Insert any that do not exist yet in categorias table
for nombre in sorted(nombres_existentes):
    existente = db.query(Categoria).filter(Categoria.nombre == nombre).first()
    if not existente:
        cat = Categoria(nombre=nombre)
        db.add(cat)
        db.flush()
        print(f"  [+] Categoria creada: {nombre} (id={cat.id})")
    else:
        print(f"  - Ya existe: {nombre} (id={existente.id})")

db.commit()

# 3. Build mapping: lower(nombre) -> id
cats = db.query(Categoria).all()
nombre_a_id = {c.nombre: c.id for c in cats}

# Ensure a default "Sin categoria" exists
default_cat = db.query(Categoria).filter(Categoria.nombre == "Sin categoria").first()
if not default_cat:
    default_cat = Categoria(nombre="Sin categoria", descripcion="Productos sin categoria asignada")
    db.add(default_cat)
    db.flush()
    print(f"  [+] Categoria por defecto creada: 'Sin categoria' (id={default_cat.id})")

# 4. Update each Producto with the correct categoria_id
for p in productos:
    if p.categoria_id is not None and p.categoria_id != 0:
        continue  # already migrated
    if p.categoria and p.categoria.strip():
        key = p.categoria.strip().lower()
        cat_id = None
        for nombre, cid in nombre_a_id.items():
            if nombre.lower() == key:
                cat_id = cid
                break
        if cat_id is None:
            # fallback: create it on the fly
            nueva = Categoria(nombre=p.categoria.strip())
            db.add(nueva)
            db.flush()
            cat_id = nueva.id
            nombre_a_id[nueva.nombre] = cat_id
            print(f"  [+] Categoria creada (fallback): {p.categoria} (id={cat_id})")
    else:
        # No categoria string — assign default
        cat_id = default_cat.id
    p.categoria_id = cat_id
    print(f"  -> Producto '{p.nombre}' -> categoria_id={cat_id}")

db.commit()
db.close()
print("\n[migracion] Migracion completada exitosamente.")
