# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func, text as sql_text
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import json
import os
from datetime import datetime, timedelta
import uuid

# Importaciones locales de base de datos y modelos
from database import engine, Base
from models import Producto, Venta, MovimientoInventario, PasswordResetToken, User
from auth import (
    authenticate_user, create_access_token, get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES, get_db, get_password_hash,
    get_user_by_email, get_user_by_username
)
from datetime import timedelta
import random
import string
from email_utils import send_reset_email, send_activation_email

# Importación válida del router modular
from api.ia.predict import predict_router

app = FastAPI(title="Elan Commerce Manager - Microservicio IA")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"🔥 ERROR 422 - Validación fallida en la ruta: {request.url.path}")
    print("🔥 Cuerpo recibido:")
    try:
        body = await request.json()
        print(json.dumps(body, indent=2))
    except Exception:
        print("No se pudo leer el cuerpo (probablemente no sea JSON).")
    print("🔥 Detalle del error de validación (Pydantic):")
    print(json.dumps(exc.errors(), indent=2))
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

# 2. Configuración de CORS Robusta
# Permitimos tanto localhost como la IP loopback para evitar bloqueos en el navegador
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 1. Configuración de CORS antes de montar rutas
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Registro del Router de IA (Arquitectura de 3 Capas)
if predict_router:
    # 2. Registro del Router sin barra diagonal final
    app.include_router(predict_router, prefix="/api/ia/predict", tags=["IA"])

# --- ESQUEMAS PYDANTIC ---

class LoginRequest(BaseModel):
    usuario: str  # Ahora recibe el username alfanumérico
    contrasena: str

class ProductoBase(BaseModel):
    nombre: str
    categoria: str
    precio: float
    stock: int
    stockMin: int

class VentaItem(BaseModel):
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio: float

class VentaRequest(BaseModel):
    items: List[VentaItem]

# --- ESQUEMAS DE CHECKOUT ---

class PagoNequi(BaseModel):
    metodo: str = "NEQUI"
    telefono: str

class PagoPSE(BaseModel):
    metodo: str = "PSE"
    banco: str
    tipo_persona: str
    tipo_doc: str
    num_doc: str

class CheckoutRequest(BaseModel):
    items: List[VentaItem]
    pago: dict  # Acepta estructura dinámica de Nequi o PSE

class AjusteInventarioRequest(BaseModel):
    producto_id: int
    tipo: str            # ENTRADA_COMPRA, AJUSTE_MERMA, DEVOLUCION
    cantidad: int        # Siempre positivo; el signo se determina por el tipo
    nota: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    token: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

    class Config:
        from_attributes = True

# --- ENDPOINTS ---

@app.post("/api/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Autenticación por username (nueva arquitectura de identidad)
    user = authenticate_user(db, username=request.usuario, password=request.contrasena)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas. Verifique su usuario y contrasena.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta aun no ha sido activada. Revisa tu correo electronico.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {"username": user.username, "email": user.email, "role": "admin"}
    }

@app.post("/api/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    PASO 1: Genera un OTP de 6 dígitos y lo envía por correo.
    NO modifica la contraseña actual del usuario.
    """
    print(f"[AUTH] Solicitud de recuperación para: {req.email}")
    
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Por seguridad no indicamos si el email existe o no
        print(f"[AUTH] Email {req.email} no encontrado en BD (respuesta genérica)")
        return {"status": "success", "message": "Si el correo está registrado, se ha enviado un código de recuperación."}
    
    # Generar código numérico de 6 dígitos
    code = ''.join(random.choices(string.digits, k=6))
    print(f"[AUTH] OTP generado: {code} para {req.email}")
    
    # Invalidar tokens anteriores de este email
    db.query(PasswordResetToken).filter(PasswordResetToken.email == req.email).delete()
    
    # Guardar nuevo token con expiración de 10 minutos
    expires = datetime.utcnow() + timedelta(minutes=10)
    token_record = PasswordResetToken(email=req.email, token=code, expires_at=expires)
    db.add(token_record)
    db.commit()
    print(f"[AUTH] Token guardado en BD. Expira: {expires.isoformat()}")
    
    # Enviar correo (nunca bloquea el flujo aunque falle)
    await send_reset_email(req.email, code)
    
    return {"status": "success", "message": "Si el correo está registrado, se ha enviado un código de recuperación."}

@app.post("/api/auth/verify-otp")
async def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    PASO 2: Valida que el OTP sea correcto y no haya expirado.
    NO modifica la contraseña. Solo confirma que el código es válido.
    """
    print(f"[AUTH] Verificando OTP para: {req.email}, código: {req.token}")
    
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.email == req.email,
        PasswordResetToken.token == req.token
    ).first()
    
    if not token_record:
        print(f"[AUTH] ❌ No se encontró token para {req.email}")
        raise HTTPException(status_code=400, detail="El código de verificación es inválido.")
    
    if token_record.expires_at < datetime.utcnow():
        print(f"[AUTH] ❌ Token expirado. Expiró: {token_record.expires_at}, Ahora: {datetime.utcnow()}")
        raise HTTPException(status_code=400, detail="El código ha expirado. Solicita uno nuevo.")
    
    print(f"[AUTH] ✅ OTP verificado correctamente para {req.email}")
    return {"status": "success", "message": "Código verificado correctamente."}

@app.post("/api/auth/reset-password")
async def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    PASO 3 (FINAL): Cambia la contraseña SOLO después de re-validar el token.
    Este es el ÚNICO punto donde se modifica hashed_password.
    """
    print(f"[AUTH] Solicitud de cambio de contraseña para: {req.email}")
    
    # Re-validar token (seguridad: el token debe seguir vigente)
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.email == req.email,
        PasswordResetToken.token == req.token
    ).first()
    
    if not token_record:
        print(f"[AUTH] ❌ Token no encontrado para reset de {req.email}")
        raise HTTPException(status_code=400, detail="El código de verificación es inválido.")
    
    if token_record.expires_at < datetime.utcnow():
        print(f"[AUTH] ❌ Token expirado durante reset para {req.email}")
        raise HTTPException(status_code=400, detail="El código ha expirado. Solicita uno nuevo.")
        
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    # === ÚNICO PUNTO DONDE SE MODIFICA LA CONTRASEÑA ===
    user.hashed_password = get_password_hash(req.new_password)
    
    # Eliminar token usado (one-time use)
    db.delete(token_record)
    db.commit()
    
    print(f"[AUTH] ✅ Contraseña actualizada exitosamente para {req.email}")
    return {"status": "success", "message": "Contraseña actualizada correctamente."}

@app.get("/api/auth/activate/{token}")
async def activate_account(token: str, db: Session = Depends(get_db)):
    print(f"[AUTH] Activación recibida con token: {token}")
    user = db.query(User).filter(User.activation_token == token).first()

    if not user:
        print("[AUTH] ❌ Token no encontrado")
        raise HTTPException(status_code=400, detail="El enlace de activación es inválido o ya fue usado.")

    if user.is_active:
        print("[AUTH] ⚠️  Cuenta ya estaba activa")
        raise HTTPException(status_code=400, detail="Esta cuenta ya está activada. Puedes iniciar sesión.")

    if user.activation_expires_at and user.activation_expires_at < datetime.utcnow():
        print("[AUTH] ❌ Token expirado")
        raise HTTPException(status_code=400, detail="El enlace de activación ha expirado. Solicita un nuevo registro.")

    user.is_active = True
    user.activation_token = None
    user.activation_expires_at = None
    db.commit()

    print(f"[AUTH] ✅ Cuenta activada exitosamente: {user.email}")
    return {"status": "success", "message": "Cuenta activada correctamente. Ya puedes iniciar sesión."}

# --- GESTIÓN DE VENTAS (REQUISITO MÓDULO 2 - SRS) ---

@app.get("/api/ventas")
async def get_ventas(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Obtiene el historial para alimentar XGBoost"""
    return db.query(Venta).all()

# --- CHECKOUT PÚBLICO (FLUJO DE PAGO SIMULADO) ---

import hashlib

def _simular_pago(pago: dict, monto: float) -> dict:
    """Mock de validacion de fondos. Reglas artificiales para simulacion."""
    metodo = pago.get("metodo", "").upper()
    # Regla: falla si el monto es multiplo de 13 (simulacion de rechazo)
    if int(monto) % 13 == 0:
        return {"ok": False, "codigo": "FONDOS_INSUFICIENTES", "mensaje": "Fondos insuficientes (simulado)"}
    # Regla: falla si el telefono termina en 00 (Nequi)
    if metodo == "NEQUI" and pago.get("telefono", "").endswith("00"):
        return {"ok": False, "codigo": "METODO_RECHAZADO", "mensaje": "Nequi rechazo la operacion (simulado)"}
    # Regla: falla si banco es 'TEST_FAIL' (PSE)
    if metodo == "PSE" and pago.get("banco", "").upper() == "TEST_FAIL":
        return {"ok": False, "codigo": "METODO_RECHAZADO", "mensaje": "PSE rechazo la operacion (simulado)"}
    # Generar referencia de pago simulada
    ref = hashlib.sha256(f"{monto}-{datetime.utcnow().isoformat()}".encode()).hexdigest()[:16].upper()
    return {"ok": True, "referencia": f"REF-{ref}"}

def _validar_pago_payload(pago: dict):
    """Valida estructura del payload de pago segun el metodo."""
    metodo = pago.get("metodo", "").upper()
    if metodo == "NEQUI":
        tel = pago.get("telefono", "")
        import re
        if not re.match(r"^3[0-9]{9}$", tel):
            raise HTTPException(status_code=400, detail="Numero Nequi invalido. Debe ser 10 digitos comenzando por 3.")
    elif metodo == "PSE":
        for campo in ["banco", "tipo_persona", "tipo_doc", "num_doc"]:
            if not pago.get(campo):
                raise HTTPException(status_code=400, detail=f"Campo requerido para PSE: {campo}")
        if pago.get("tipo_persona") not in ["NATURAL", "JURIDICA"]:
            raise HTTPException(status_code=400, detail="tipo_persona debe ser NATURAL o JURIDICA.")
        if pago.get("tipo_doc") not in ["CC", "CE", "NIT"]:
            raise HTTPException(status_code=400, detail="tipo_doc debe ser CC, CE o NIT.")
    else:
        raise HTTPException(status_code=400, detail=f"Metodo de pago no soportado: {metodo}")

@app.post("/api/checkout")
async def checkout(req: CheckoutRequest, db: Session = Depends(get_db)):
    """
    Flujo completo de checkout publico:
    1. Validar payload de pago
    2. Validar stock de todos los items
    3. Simular validacion de fondos
    4. Si exitoso: crear venta, actualizar stock, registrar movimientos
    5. Si falla: retornar error sin modificar BD
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="El carrito esta vacio.")

    # 1. Validar estructura del pago
    _validar_pago_payload(req.pago)

    # 2. Validar stock y calcular total real
    items_para_guardar = []
    total_venta = 0.0

    for item in req.items:
        producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not producto:
            raise HTTPException(status_code=404, detail=f"Producto con ID {item.producto_id} no encontrado.")
        if producto.stock < item.cantidad:
            raise HTTPException(
                status_code=409,
                detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, Solicitado: {item.cantidad}"
            )
        precio_real = producto.precio
        subtotal = precio_real * item.cantidad
        total_venta += subtotal
        items_para_guardar.append({
            "producto_id": item.producto_id,
            "nombre_producto": producto.nombre,
            "cantidad": item.cantidad,
            "precio": precio_real
        })

    # 3. Simular validacion de fondos
    resultado_pago = _simular_pago(req.pago, total_venta)

    if not resultado_pago["ok"]:
        # Registrar venta como RECHAZADA para trazabilidad
        venta_rechazada = Venta(
            items=json.dumps(items_para_guardar),
            total=total_venta,
            metodo_pago=req.pago.get("metodo", "DESCONOCIDO"),
            estado="RECHAZADA",
            referencia_pago=None
        )
        db.add(venta_rechazada)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail={
                "codigo": resultado_pago["codigo"],
                "mensaje": resultado_pago["mensaje"]
            }
        )

    # 4. Pago aprobado: crear venta + descontar stock
    try:
        nueva_venta = Venta(
            items=json.dumps(items_para_guardar),
            total=total_venta,
            metodo_pago=req.pago.get("metodo", "DESCONOCIDO"),
            estado="APROBADA",
            referencia_pago=resultado_pago["referencia"]
        )
        db.add(nueva_venta)
        db.flush()

        for item_data in items_para_guardar:
            producto = db.query(Producto).filter(Producto.id == item_data["producto_id"]).first()
            producto.stock -= item_data["cantidad"]
            movimiento = MovimientoInventario(
                producto_id=item_data["producto_id"],
                tipo="VENTA",
                cantidad=-item_data["cantidad"],
                stock_resultante=producto.stock,
                referencia_id=nueva_venta.id,
                nota=f"Checkout #{nueva_venta.id}"
            )
            db.add(movimiento)

        db.commit()
        db.refresh(nueva_venta)

        return {
            "status": "success",
            "venta_id": nueva_venta.id,
            "total": total_venta,
            "referencia_pago": resultado_pago["referencia"],
            "metodo_pago": req.pago.get("metodo"),
            "estado": "APROBADA",
            "items": items_para_guardar
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno al procesar la venta: {str(e)}")

@app.post("/api/ventas")
async def create_venta(venta: VentaRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Registra venta, valida stock y descuenta inventario de forma transaccional"""
    try:
        items_para_guardar = []
        total_venta = 0.0

        for item in venta.items:
            # 1. Buscar el producto real en la base de datos
            producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
            if not producto:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto con ID {item.producto_id} no encontrado."
                )

            # 2. Validar que haya stock suficiente
            if producto.stock < item.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, Solicitado: {item.cantidad}"
                )

            # 3. Usar el precio REAL de la base de datos (seguridad anti-spoofing)
            precio_real = producto.precio
            subtotal = precio_real * item.cantidad
            total_venta += subtotal

            # 4. Descontar el stock del producto
            producto.stock -= item.cantidad

            items_para_guardar.append({
                "producto_id": item.producto_id,
                "nombre_producto": producto.nombre,
                "cantidad": item.cantidad,
                "precio": precio_real
            })

        # 5. Crear el registro de venta con datos seguros
        nueva_venta = Venta(
            items=json.dumps(items_para_guardar),
            total=total_venta
        )

        db.add(nueva_venta)
        db.flush()  # Obtener el ID de la venta antes del commit

        # 6. Registrar movimientos de inventario para cada item
        for item_data in items_para_guardar:
            producto = db.query(Producto).filter(Producto.id == item_data["producto_id"]).first()
            movimiento = MovimientoInventario(
                producto_id=item_data["producto_id"],
                tipo="VENTA",
                cantidad=-item_data["cantidad"],
                stock_resultante=producto.stock,
                referencia_id=nueva_venta.id,
                nota=f"Venta #{nueva_venta.id}"
            )
            db.add(movimiento)

        # 7. Commit único: venta + descuento de stock + movimientos (transacción ACID)
        db.commit()
        db.refresh(nueva_venta)
        return {"status": "success", "venta_id": nueva_venta.id, "total": total_venta}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al registrar venta: {str(e)}")

# --- GESTIÓN DE PRODUCTOS ---

@app.get("/api/productos")
async def list_productos(db: Session = Depends(get_db)):
    return db.query(Producto).all()

@app.get("/api/catalogo")
async def list_catalogo(db: Session = Depends(get_db)):
    """Obtiene los productos disponibles para la venta (stock > 0) para el frontend público"""
    return db.query(Producto).filter(Producto.stock > 0).all()

@app.post("/api/productos", status_code=201)
async def create_producto(producto: ProductoBase, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    nuevo = Producto(**producto.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@app.put("/api/productos/{producto_id}")
async def update_producto(producto_id: int, producto: ProductoBase, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for key, value in producto.dict().items():
        setattr(p, key, value)
    db.commit()
    db.refresh(p)
    return p

@app.delete("/api/productos/{producto_id}", status_code=204)
async def delete_producto(producto_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(p)
    db.commit()

# --- GESTION DE USUARIOS (ADMIN) ---

@app.get("/api/users", response_model=List[UserResponse])
async def list_users(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(User).all()

@app.post("/api/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Validar que username sea alfanumerico
    import re
    if not re.match(r"^[a-zA-Z0-9_]{3,30}$", user.username):
        raise HTTPException(status_code=400, detail="El username debe ser alfanumerico (3-30 caracteres, sin espacios).")

    # Verificar duplicados
    if get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="El username ya esta registrado.")
    if get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="El email ya esta registrado.")

    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)

    new_user = User(
        username=user.username,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        is_active=False,
        activation_token=token,
        activation_expires_at=expires_at,
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        db.execute(
            sql_text(
                "SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users"
            )
        )
        db.commit()
        raise HTTPException(status_code=400, detail="Conflicto de llave unica al crear usuario.")

    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    activation_url = f"{base_url}/activate/{token}"
    await send_activation_email(user.email, activation_url)

    return new_user

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    
    # Evitar que el administrador se borre a sí mismo si solo hay uno
    if user.username == current_user.username:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de administrador.")

    db.delete(user)
    db.commit()
    return {"status": "success", "message": "Usuario eliminado correctamente."}

# ========================================================================
# MÓDULO DE INVENTARIO — Centro Operativo de Flujo de Mercancía
# ========================================================================

@app.get("/api/inventario/resumen")
async def inventario_resumen(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Dashboard KPIs: valor total de inventario, alertas de stock bajo,
    productos estancados y velocidad de venta promedio.
    """
    productos = db.query(Producto).all()

    # Valor total del inventario (stock * precio de cada producto)
    valor_total = sum(p.stock * p.precio for p in productos)

    # Productos con stock crítico (stock <= stockMin)
    productos_criticos = [p for p in productos if p.stock <= p.stockMin]
    alertas_count = len(productos_criticos)
    sin_stock_count = len([p for p in productos if p.stock == 0])

    # Productos estancados: con stock > 0 pero sin ventas en los últimos 60 días
    hace_60_dias = datetime.utcnow() - timedelta(days=60)
    ids_con_venta_reciente = set()
    movimientos_recientes = db.query(MovimientoInventario).filter(
        MovimientoInventario.tipo == "VENTA",
        MovimientoInventario.fecha >= hace_60_dias
    ).all()
    for m in movimientos_recientes:
        ids_con_venta_reciente.add(m.producto_id)

    estancados = [p for p in productos if p.stock > 0 and p.id not in ids_con_venta_reciente]
    estancados_count = len(estancados)

    return {
        "valor_total": valor_total,
        "total_productos": len(productos),
        "alertas_stock_bajo": alertas_count,
        "sin_stock": sin_stock_count,
        "estancados": estancados_count
    }

@app.get("/api/inventario/productos")
async def inventario_productos(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Tabla principal de inventario con métricas de rotación calculadas.
    Cada producto incluye: velocidad de venta (últimos 30 días), estado y unidades vendidas.
    """
    productos = db.query(Producto).all()

    hace_30_dias = datetime.utcnow() - timedelta(days=30)
    hace_60_dias = datetime.utcnow() - timedelta(days=60)

    # Obtener todas las ventas de los últimos 30 días agrupadas por producto
    movimientos_30d = db.query(MovimientoInventario).filter(
        MovimientoInventario.tipo == "VENTA",
        MovimientoInventario.fecha >= hace_30_dias
    ).all()

    # Obtener IDs de productos con ventas en los últimos 60 días
    movimientos_60d = db.query(MovimientoInventario).filter(
        MovimientoInventario.tipo == "VENTA",
        MovimientoInventario.fecha >= hace_60_dias
    ).all()
    ids_con_venta_60d = set(m.producto_id for m in movimientos_60d)

    # Calcular ventas por producto en 30 días
    ventas_por_producto = {}
    for m in movimientos_30d:
        pid = m.producto_id
        ventas_por_producto[pid] = ventas_por_producto.get(pid, 0) + abs(m.cantidad)

    resultado = []
    for p in productos:
        unidades_vendidas_30d = ventas_por_producto.get(p.id, 0)
        velocidad_diaria = round(unidades_vendidas_30d / 30, 2)

        # Determinar estado
        if p.stock == 0:
            estado = "SIN_STOCK"
        elif p.stock <= p.stockMin:
            estado = "CRITICO"
        elif p.stock > 0 and p.id not in ids_con_venta_60d:
            estado = "ESTANCADO"
        else:
            estado = "OPTIMO"

        # Días de stock restante estimados
        dias_restantes = None
        if velocidad_diaria > 0:
            dias_restantes = round(p.stock / velocidad_diaria)

        resultado.append({
            "id": p.id,
            "nombre": p.nombre,
            "categoria": p.categoria,
            "precio": p.precio,
            "stock": p.stock,
            "stockMin": p.stockMin,
            "ventas_30d": unidades_vendidas_30d,
            "velocidad_diaria": velocidad_diaria,
            "dias_restantes": dias_restantes,
            "estado": estado
        })

    return resultado

@app.get("/api/inventario/movimientos/{producto_id}")
async def inventario_movimientos(producto_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Trazabilidad: Historial completo de movimientos de un producto.
    Devuelve una línea de tiempo ordenada de más reciente a más antiguo.
    """
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    movimientos = db.query(MovimientoInventario).filter(
        MovimientoInventario.producto_id == producto_id
    ).order_by(MovimientoInventario.fecha.desc()).limit(100).all()

    return {
        "producto": {
            "id": producto.id,
            "nombre": producto.nombre,
            "stock_actual": producto.stock,
            "stockMin": producto.stockMin
        },
        "movimientos": [
            {
                "id": m.id,
                "tipo": m.tipo,
                "cantidad": m.cantidad,
                "stock_resultante": m.stock_resultante,
                "referencia_id": m.referencia_id,
                "nota": m.nota,
                "fecha": m.fecha.isoformat() if m.fecha else None
            }
            for m in movimientos
        ]
    }

@app.post("/api/inventario/ajuste")
async def inventario_ajuste(ajuste: AjusteInventarioRequest, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Registrar un ajuste manual de inventario: compra de stock, merma, devolución.
    """
    producto = db.query(Producto).filter(Producto.id == ajuste.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    tipos_validos = ["ENTRADA_COMPRA", "AJUSTE_MERMA", "DEVOLUCION"]
    if ajuste.tipo not in tipos_validos:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Debe ser uno de: {tipos_validos}")

    # Determinar signo según el tipo
    if ajuste.tipo in ["ENTRADA_COMPRA", "DEVOLUCION"]:
        cambio = abs(ajuste.cantidad)
    else:  # AJUSTE_MERMA
        cambio = -abs(ajuste.cantidad)
        if producto.stock + cambio < 0:
            raise HTTPException(status_code=400, detail="La merma no puede dejar el stock por debajo de 0")

    producto.stock += cambio

    movimiento = MovimientoInventario(
        producto_id=ajuste.producto_id,
        tipo=ajuste.tipo,
        cantidad=cambio,
        stock_resultante=producto.stock,
        nota=ajuste.nota or f"Ajuste manual: {ajuste.tipo}"
    )
    db.add(movimiento)
    db.commit()
    db.refresh(producto)

    return {
        "status": "success",
        "producto_id": producto.id,
        "nuevo_stock": producto.stock,
        "movimiento_tipo": ajuste.tipo
    }

@app.get("/api/inventario/alertas")
async def inventario_alertas(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """
    Lista de productos que requieren acción inmediata: stock bajo o sin stock.
    """
    productos = db.query(Producto).filter(Producto.stock <= Producto.stockMin).all()

    resultado = []
    for p in productos:
        if p.stock == 0:
            severidad = "CRITICO"
            mensaje = "Sin stock — reposición urgente"
        else:
            severidad = "BAJO"
            mensaje = f"Stock bajo: {p.stock}/{p.stockMin} unidades"

        resultado.append({
            "id": p.id,
            "nombre": p.nombre,
            "categoria": p.categoria,
            "stock": p.stock,
            "stockMin": p.stockMin,
            "severidad": severidad,
            "mensaje": mensaje
        })

    return resultado

# 4. Optimización de Arranque (Solución a SpawnProcess/Python 3.14)
# 3. Estabilidad y protección de arranque (SpawnProcess en Python 3.14+)
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)