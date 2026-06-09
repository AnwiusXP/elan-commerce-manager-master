from database import SessionLocal, engine, Base
from models import Producto, Categoria

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Build lookup: lower(categoria string) -> categoria_id
cats = db.query(Categoria).all()
cat_lookup = {c.nombre.lower(): c.id for c in cats}

productos_prueba = [
    {'nombre': 'Ambientador', 'categoria': 'cuidado hogar', 'precio': 35000, 'stock': 48, 'stockMin': 10},
    {'nombre': 'Hipoclorito', 'categoria': 'cuidado hogar', 'precio': 52000, 'stock': 12, 'stockMin': 10},
    {'nombre': 'Suavizante', 'categoria': 'cuidado hogar', 'precio': 28000, 'stock': 8, 'stockMin': 10},
    {'nombre': 'Gel antibacterial', 'categoria': 'cuidado personal', 'precio': 45000, 'stock': 20, 'stockMin': 10},
    {'nombre': 'Limpiavidrios', 'categoria': 'cuidado hogar', 'precio': 32000, 'stock': 35, 'stockMin': 10},
]

for prod_data in productos_prueba:
    existente = db.query(Producto).filter(Producto.nombre == prod_data['nombre']).first()
    if not existente:
        key = prod_data['categoria'].strip().lower()
        categoria_id = cat_lookup.get(key)
        if not categoria_id:
            slug = prod_data['categoria'].strip().lower().replace(' ', '-')
            nueva_cat = Categoria(nombre=prod_data['categoria'], slug=slug)
            db.add(nueva_cat)
            db.flush()
            categoria_id = nueva_cat.id
            cat_lookup[key] = categoria_id
            print(f'  [+] Categoria creada: {prod_data["categoria"]} (id={categoria_id})')
        prod_data['categoria_id'] = categoria_id
        producto = Producto(**prod_data)
        db.add(producto)
        print(f'Agregado: {prod_data["nombre"]}')

db.commit()
db.close()
print('Productos de prueba agregados')