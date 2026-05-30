# backend/main.py
from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks, UploadFile, File, Form
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func, text
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import json
import os
from datetime import datetime, timedelta
import uuid

# Importaciones locales de base de datos y modelos
from database import engine, Base
from models import (
    Producto,
    Categoria,
    Venta,
    VentaItem,
    MovimientoInventario,
    PasswordResetToken,
    User,
    Pedido,
    PedidoItem,
)
from auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_current_admin_user,
    get_current_user_optional,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_db,
    get_password_hash,
    get_user_by_email,
    get_user_by_username,
)
from datetime import timedelta
import random
import string
from email_utils import send_reset_email, send_activation_email
from enum import Enum

# Importación válida del router modular
from api.ia.predict import predict_router


class CategoriaOficial(Enum):
    AMBIENTACION           = ("Ambientación",           "ambientacion")
    LIMPIEZA_HOGAR         = ("Limpieza del Hogar",     "limpieza_hogar")
    PISOS_SUPERFICIES      = ("Pisos y Superficies",    "pisos_superficies")
    LAVADO_ROPA            = ("Lavado de Ropa",         "lavado_ropa")
    HIGIENE_PERSONAL       = ("Higiene Personal",       "higiene_personal")
    SOLVENTES_INDUSTRIALES = ("Solventes e Industriales","solventes_industriales")

    @property
    def nombre(self): return self.value[0]
    @property
    def slug(self):   return self.value[1]


SLUGS_OFICIALES = {m.slug for m in CategoriaOficial}

app = FastAPI(title="Elan Commerce Manager - Microservicio IA")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print(f"[VALIDATION] ERROR 422 - Validacion fallida en la ruta: {request.url.path}")
    print("[VALIDATION] Cuerpo recibido:")
    try:
        body = await request.json()
        print(json.dumps(body, indent=2))
    except Exception:
        print("No se pudo leer el cuerpo (probablemente no sea JSON).")
    print("[VALIDATION] Detalle del error de validacion (Pydantic):")
    print(json.dumps(exc.errors(), indent=2))
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )


# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

# 2. Configuración de CORS Dinámica (Local + Producción)
# Orígenes locales explícitos para desarrollo (los navegadores jamás envían 0.0.0.0 como Origin)
LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Leer FRONTEND_URL desde variable de entorno (Render inyecta esta variable)
FRONTEND_URL = os.getenv("FRONTEND_URL")

# Orígenes extra dinámicos (IP local, Ngrok, etc.) desde variable de entorno
# Formato: EXTRA_ORIGINS=http://192.168.1.10:5173,https://xxxx.ngrok.io
EXTRA_ORIGINS_RAW = os.getenv("EXTRA_ORIGINS", "")
EXTRA_ORIGINS = []
if EXTRA_ORIGINS_RAW:
    EXTRA_ORIGINS = [origin.strip() for origin in EXTRA_ORIGINS_RAW.split(",") if origin.strip()]

# Construir lista de orígenes: locales + extra + producción (si está configurada)
origins = LOCAL_ORIGINS.copy()
if FRONTEND_URL:
    origins.append(FRONTEND_URL)
origins.extend(EXTRA_ORIGINS)

# Fallback para producción de Render (URL hardcodeada como respaldo)
PRODUCTION_ORIGIN = "https://elan-commerce-manager-master-1.onrender.com"
if PRODUCTION_ORIGIN not in origins:
    origins.append(PRODUCTION_ORIGIN)

# Eliminar duplicados preservando orden
seen = set()
origins = [o for o in origins if not (o in seen or seen.add(o))]

print(f" [CORS] Configurado para: {origins}")

# 1. Configuración de CORS antes de montar rutas
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Registro del Router de IA (Arquitectura de 3 Capas)
if predict_router:
    # 2. Registro del Router sin barra diagonal final
    app.include_router(predict_router, prefix="/api/ia/predict", tags=["IA"])

# --- ARCHIVOS ESTÁTICOS (IMÁGENES DE PRODUCTOS) ---

UPLOAD_DIR = "static/images/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- ESQUEMAS PYDANTIC ---


class LoginRequest(BaseModel):
    usuario: str  # Ahora recibe el username alfanumérico
    contrasena: str


class CategoriaBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class CategoriaResponse(CategoriaBase):
    id: int

    class Config:
        from_attributes = True


class ProductoBase(BaseModel):
    nombre: str
    categoria_id: int
    precio: float
    stock: int
    stockMin: int


def _validar_categoria_oficial(categoria_id: int, db: Session) -> Categoria:
    cat = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not cat or cat.slug not in SLUGS_OFICIALES:
        raise HTTPException(
            status_code=400,
            detail=f"Slug no válido. Esperados: {', '.join(sorted(SLUGS_OFICIALES))}"
        )
    return cat


class VentaItemRequest(BaseModel):
    producto_id: int
    nombre_producto: str
    cantidad: int
    precio: float


class VentaRequest(BaseModel):
    items: List[VentaItemRequest]


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
    items: List[VentaItemRequest]
    pago: dict  # Acepta estructura dinámica de Nequi o PSE


class AjusteInventarioRequest(BaseModel):
    producto_id: int
    tipo: str  # ENTRADA_COMPRA, AJUSTE_MERMA, DEVOLUCION
    cantidad: int  # Siempre positivo; el signo se determina por el tipo
    nota: Optional[str] = None


class ReembolsoItemRequest(BaseModel):
    producto_id: int
    cantidad: int  # Unidades a devolver


class ReembolsoRequest(BaseModel):
    venta_id: int
    items: Optional[List[ReembolsoItemRequest]] = None  # None = reembolso total
    motivo: Optional[str] = None


# --- ESQUEMAS DE PEDIDOS PÚBLICOS (Nequi Contra Entrega) ---


class PedidoItemRequest(BaseModel):
    producto_id: int
    cantidad: int


class CrearPedidoRequest(BaseModel):
    cliente_nombre: str
    cliente_telefono: str
    cliente_direccion: str
    cliente_ciudad: str
    cliente_email: Optional[str] = None
    nequi_celular: str
    items: List[PedidoItemRequest]


class ActualizarEstadoPedidoRequest(BaseModel):
    nuevo_estado: str  # DESPACHADO | ENTREGADO | CANCELADO


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
    rol: str = "cliente_base"


class UserUpdate(BaseModel):
    """Esquema genérico de actualización.
    Nótese que el campo 'rol' está deliberadamente OMITIDO.
    El rol se asigna ÚNICAMENTE en la creación y es 100% inmutable después."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    rol: str

    class Config:
        from_attributes = True


class UserStatusUpdate(BaseModel):
    is_active: bool


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
        data={"sub": user.username, "user_id": user.id, "rol": user.rol},
        expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.rol},
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
        raise HTTPException(status_code=404, detail="Email no encontrado.")

    # Generar código numérico de 6 dígitos
    code = "".join(random.choices(string.digits, k=6))
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

    return {
        "status": "success",
        "message": "Si el correo está registrado, se ha enviado un código de recuperación.",
    }


@app.post("/api/auth/verify-otp")
async def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    """
    PASO 2: Valida que el OTP sea correcto y no haya expirado.
    NO modifica la contraseña. Solo confirma que el código es válido.
    """
    print(f"[AUTH] Verificando OTP para: {req.email}, código: {req.token}")

    token_record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == req.email, PasswordResetToken.token == req.token
        )
        .first()
    )

    if not token_record:
        print(f"[AUTH] ❌ No se encontró token para {req.email}")
        raise HTTPException(
            status_code=400, detail="El código de verificación es inválido."
        )

    if token_record.expires_at < datetime.utcnow():
        print(
            f"[AUTH] ❌ Token expirado. Expiró: {token_record.expires_at}, Ahora: {datetime.utcnow()}"
        )
        raise HTTPException(
            status_code=400, detail="El código ha expirado. Solicita uno nuevo."
        )

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
    token_record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.email == req.email, PasswordResetToken.token == req.token
        )
        .first()
    )

    if not token_record:
        print(f"[AUTH] ❌ Token no encontrado para reset de {req.email}")
        raise HTTPException(
            status_code=400, detail="El código de verificación es inválido."
        )

    if token_record.expires_at < datetime.utcnow():
        print(f"[AUTH] ❌ Token expirado durante reset para {req.email}")
        raise HTTPException(
            status_code=400, detail="El código ha expirado. Solicita uno nuevo."
        )

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
        raise HTTPException(
            status_code=400,
            detail="El enlace de activación es inválido o ya fue usado.",
        )

    if user.is_active:
        print("[AUTH] ⚠️  Cuenta ya estaba activa")
        raise HTTPException(
            status_code=400,
            detail="Esta cuenta ya está activada. Puedes iniciar sesión.",
        )

    if user.activation_expires_at and user.activation_expires_at < datetime.utcnow():
        print("[AUTH] ❌ Token expirado")
        raise HTTPException(
            status_code=400,
            detail="El enlace de activación ha expirado. Solicita un nuevo registro.",
        )

    user.is_active = True
    user.activation_token = None
    user.activation_expires_at = None
    db.commit()

    print(f"[AUTH] ✅ Cuenta activada exitosamente: {user.email}")
    return {
        "status": "success",
        "message": "Cuenta activada correctamente. Ya puedes iniciar sesión.",
    }


# --- GESTIÓN DE VENTAS (REQUISITO MÓDULO 2 - SRS) ---


@app.get("/api/ventas")
async def get_ventas(
    db: Session = Depends(get_db), current_user=Depends(get_current_admin_user)
):
    """Obtiene el historial de ventas activas (APROBADA) para alimentar Dashboard y XGBoost.
    Las ventas RECHAZADA, REEMBOLSADA o CANCELADA se excluyen de métricas."""
    return db.query(Venta).filter(Venta.estado == "APROBADA").all()


# --- CHECKOUT PÚBLICO (FLUJO DE PAGO SIMULADO) ---

import hashlib  # noqa: E402


def _simular_pago(pago: dict, monto: float) -> dict:
    """Mock de validacion de fondos. Reglas artificiales para simulacion."""
    metodo = pago.get("metodo", "").upper()
    # Regla: falla si el monto es multiplo de 13 (simulacion de rechazo)
    if int(monto) % 13 == 0:
        return {
            "ok": False,
            "codigo": "FONDOS_INSUFICIENTES",
            "mensaje": "Fondos insuficientes (simulado)",
        }
    # Regla: falla si el telefono termina en 00 (Nequi)
    if metodo == "NEQUI" and pago.get("telefono", "").endswith("00"):
        return {
            "ok": False,
            "codigo": "METODO_RECHAZADO",
            "mensaje": "Nequi rechazo la operacion (simulado)",
        }
    # Regla: falla si banco es 'TEST_FAIL' (PSE)
    if metodo == "PSE" and pago.get("banco", "").upper() == "TEST_FAIL":
        return {
            "ok": False,
            "codigo": "METODO_RECHAZADO",
            "mensaje": "PSE rechazo la operacion (simulado)",
        }
    # Generar referencia de pago simulada
    ref = (
        hashlib.sha256(f"{monto}-{datetime.utcnow().isoformat()}".encode())
        .hexdigest()[:16]
        .upper()
    )
    return {"ok": True, "referencia": f"REF-{ref}"}


def _validar_pago_payload(pago: dict):
    """Valida estructura del payload de pago segun el metodo."""
    metodo = pago.get("metodo", "").upper()
    if metodo == "NEQUI":
        tel = pago.get("telefono", "")
        import re

        if not re.match(r"^3[0-9]{9}$", tel):
            raise HTTPException(
                status_code=400,
                detail="Numero Nequi invalido. Debe ser 10 digitos comenzando por 3.",
            )
    elif metodo == "PSE":
        for campo in ["banco", "tipo_persona", "tipo_doc", "num_doc"]:
            if not pago.get(campo):
                raise HTTPException(
                    status_code=400, detail=f"Campo requerido para PSE: {campo}"
                )
        if pago.get("tipo_persona") not in ["NATURAL", "JURIDICA"]:
            raise HTTPException(
                status_code=400, detail="tipo_persona debe ser NATURAL o JURIDICA."
            )
        if pago.get("tipo_doc") not in ["CC", "CE", "NIT"]:
            raise HTTPException(
                status_code=400, detail="tipo_doc debe ser CC, CE o NIT."
            )
    else:
        raise HTTPException(
            status_code=400, detail=f"Metodo de pago no soportado: {metodo}"
        )


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
            raise HTTPException(
                status_code=404,
                detail=f"Producto con ID {item.producto_id} no encontrado.",
            )
        if producto.stock < item.cantidad:
            raise HTTPException(
                status_code=409,
                detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, Solicitado: {item.cantidad}",
            )
        precio_real = producto.precio
        subtotal = precio_real * item.cantidad
        total_venta += subtotal
        items_para_guardar.append(
            {
                "producto_id": item.producto_id,
                "nombre_producto": producto.nombre,
                "cantidad": item.cantidad,
                "precio": precio_real,
            }
        )

    # 3. Simular validacion de fondos
    resultado_pago = _simular_pago(req.pago, total_venta)

    if not resultado_pago["ok"]:
        # Registrar venta como RECHAZADA para trazabilidad
        venta_rechazada = Venta(
            items=json.dumps(items_para_guardar),
            total=total_venta,
            metodo_pago=req.pago.get("metodo", "DESCONOCIDO"),
            estado="RECHAZADA",
            referencia_pago=None,
        )
        db.add(venta_rechazada)
        db.commit()
        raise HTTPException(
            status_code=400,
            detail={
                "codigo": resultado_pago["codigo"],
                "mensaje": resultado_pago["mensaje"],
            },
        )

    # 4. Pago aprobado: crear venta + descontar stock
    try:
        nueva_venta = Venta(
            items=json.dumps(items_para_guardar),
            total=total_venta,
            metodo_pago=req.pago.get("metodo", "DESCONOCIDO"),
            estado="APROBADA",
            referencia_pago=resultado_pago["referencia"],
        )
        db.add(nueva_venta)
        db.flush()

        for item_data in items_para_guardar:
            producto = (
                db.query(Producto)
                .filter(Producto.id == item_data["producto_id"])
                .first()
            )
            producto.stock -= item_data["cantidad"]

            # Registro normalizado en venta_items (FK a producto)
            detalle = VentaItem(
                venta_id=nueva_venta.id,
                producto_id=item_data["producto_id"],
                nombre_producto=item_data["nombre_producto"],
                cantidad=item_data["cantidad"],
                precio_unitario=item_data["precio"],
                subtotal=item_data["precio"] * item_data["cantidad"],
            )
            db.add(detalle)

            movimiento = MovimientoInventario(
                producto_id=item_data["producto_id"],
                tipo="VENTA",
                cantidad=-item_data["cantidad"],
                stock_resultante=producto.stock,
                referencia_id=nueva_venta.id,
                nota=f"Checkout #{nueva_venta.id}",
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
            "items": items_para_guardar,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error interno al procesar la venta: {str(e)}"
        )


@app.post("/api/ventas")
async def create_venta(
    venta: VentaRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    """Registra venta, valida stock y descuenta inventario de forma transaccional"""
    try:
        items_para_guardar = []
        total_venta = 0.0

        for item in venta.items:
            # 1. Buscar el producto real en la base de datos
            producto = (
                db.query(Producto).filter(Producto.id == item.producto_id).first()
            )
            if not producto:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto con ID {item.producto_id} no encontrado.",
                )

            # 2. Validar que haya stock suficiente
            if producto.stock < item.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, Solicitado: {item.cantidad}",
                )

            # 3. Usar el precio REAL de la base de datos (seguridad anti-spoofing)
            precio_real = producto.precio
            subtotal = precio_real * item.cantidad
            total_venta += subtotal

            # 4. Descontar el stock del producto
            producto.stock -= item.cantidad

            items_para_guardar.append(
                {
                    "producto_id": item.producto_id,
                    "nombre_producto": producto.nombre,
                    "cantidad": item.cantidad,
                    "precio": precio_real,
                }
            )

        # 5. Crear el registro de venta con datos seguros
        nueva_venta = Venta(items=json.dumps(items_para_guardar), total=total_venta)

        db.add(nueva_venta)
        db.flush()  # Obtener el ID de la venta antes del commit

        # 6. Registrar VentaItems normalizados + movimientos de inventario
        for item_data in items_para_guardar:
            producto = (
                db.query(Producto)
                .filter(Producto.id == item_data["producto_id"])
                .first()
            )

            # Registro normalizado en venta_items (FK a producto)
            detalle = VentaItem(
                venta_id=nueva_venta.id,
                producto_id=item_data["producto_id"],
                nombre_producto=item_data["nombre_producto"],
                cantidad=item_data["cantidad"],
                precio_unitario=item_data["precio"],
                subtotal=item_data["precio"] * item_data["cantidad"],
            )
            db.add(detalle)

            movimiento = MovimientoInventario(
                producto_id=item_data["producto_id"],
                tipo="VENTA",
                cantidad=-item_data["cantidad"],
                stock_resultante=producto.stock,
                referencia_id=nueva_venta.id,
                nota=f"Venta #{nueva_venta.id}",
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
        raise HTTPException(
            status_code=400, detail=f"Error al registrar venta: {str(e)}"
        )


# --- GESTIÓN DE PRODUCTOS ---


def apply_price_rules(productos, current_user):
    if not current_user:
        for p in productos:
            p.precio = None
            p.precio_base = None
            p.precio_distribuidor = None
    elif current_user.rol == "distribuidor":
        for p in productos:
            p.precio = p.precio_distribuidor
            p.precio_base = None
    elif current_user.rol == "cliente_base":
        for p in productos:
            p.precio = p.precio_base
            p.precio_distribuidor = None
    return productos


@app.get("/api/productos")
async def list_productos(
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    query = db.query(Producto)
    if categoria:
        slug_normalizado = categoria.strip().lower()
        query = query.join(Producto.categoria_rel).filter(Categoria.slug == slug_normalizado)
    productos = query.all()
    return apply_price_rules(productos, current_user)


@app.get("/api/catalogo")
async def list_catalogo(
    categoria_id: Optional[int] = None,
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Obtiene los productos disponibles para la venta (stock > 0) para el frontend público.
    Opcionalmente filtra por categoria_id o por slug de categoría."""
    query = db.query(Producto).filter(Producto.stock > 0)
    if categoria_id is not None:
        query = query.filter(Producto.categoria_id == categoria_id)
    if categoria:
        query = query.join(Producto.categoria_rel).filter(Categoria.slug == categoria.strip().lower())
    productos = query.all()
    return apply_price_rules(productos, current_user)


@app.post("/api/productos", status_code=201)
async def create_producto(
    nombre: str = Form(...),
    categoria_id: int = Form(...),
    precio_base: float = Form(...),
    precio_distribuidor: float = Form(...),
    stock: int = Form(...),
    stockMin: int = Form(...),
    imagen: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    cat = _validar_categoria_oficial(categoria_id, db)

    nuevo = Producto(
        nombre=nombre,
        categoria=cat.nombre,
        categoria_id=categoria_id,
        precio=precio_base,
        precio_base=precio_base,
        precio_distribuidor=precio_distribuidor,
        stock=stock,
        stockMin=stockMin,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    if imagen and imagen.filename:
        ext = os.path.splitext(imagen.filename)[1] or ".jpg"
        filename = f"{nuevo.id}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        contents = await imagen.read()
        with open(filepath, "wb") as f:
            f.write(contents)

    return nuevo


@app.put("/api/productos/{producto_id}")
async def update_producto(
    producto_id: int,
    nombre: str = Form(...),
    categoria_id: int = Form(...),
    precio_base: float = Form(...),
    precio_distribuidor: float = Form(...),
    stock: int = Form(...),
    stockMin: int = Form(...),
    imagen: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    cat = _validar_categoria_oficial(categoria_id, db)

    p.nombre = nombre
    p.categoria = cat.nombre
    p.categoria_id = categoria_id
    p.precio = precio_base
    p.precio_base = precio_base
    p.precio_distribuidor = precio_distribuidor
    p.stock = stock
    p.stockMin = stockMin

    if imagen and imagen.filename:
        ext = os.path.splitext(imagen.filename)[1] or ".jpg"
        filename = f"{producto_id}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        contents = await imagen.read()
        with open(filepath, "wb") as f:
            f.write(contents)

    db.commit()
    db.refresh(p)
    return p


@app.delete("/api/productos/{producto_id}", status_code=204)
async def delete_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    p = db.query(Producto).filter(Producto.id == producto_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        filepath = os.path.join(UPLOAD_DIR, f"{producto_id}{ext}")
        if os.path.exists(filepath):
            os.remove(filepath)
            break

    db.delete(p)
    db.commit()


# --- GESTIÓN DE CATEGORÍAS ---


@app.get("/api/categorias")
async def list_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).order_by(Categoria.nombre).all()


@app.post("/api/categorias", status_code=201)
async def create_categoria(
    cat: CategoriaBase,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    existente = db.query(Categoria).filter(Categoria.nombre == cat.nombre).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre.")
    nueva = Categoria(nombre=cat.nombre, descripcion=cat.descripcion)
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva


@app.put("/api/categorias/{categoria_id}")
async def update_categoria(
    categoria_id: int,
    cat: CategoriaBase,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    c = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")
    duplicado = db.query(Categoria).filter(Categoria.nombre == cat.nombre, Categoria.id != categoria_id).first()
    if duplicado:
        raise HTTPException(status_code=400, detail="Ya existe otra categoría con ese nombre.")
    c.nombre = cat.nombre
    c.descripcion = cat.descripcion
    db.commit()
    db.refresh(c)
    return c


@app.delete("/api/categorias/{categoria_id}", status_code=204)
async def delete_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    c = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")
    productos_asociados = db.query(Producto).filter(Producto.categoria_id == categoria_id).count()
    if productos_asociados > 0:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede eliminar: {productos_asociados} producto(s) usan esta categoría."
        )
    db.delete(c)
    db.commit()


@app.post("/api/categorias/seed-oficiales", status_code=201)
async def seed_categorias_oficiales(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    # ── Paso 0: Asegurar columna slug + poblar registros legacy ──
    with db.bind.connect() as conn:
        result = conn.execute(
            text("SELECT column_name FROM information_schema.columns "
                 "WHERE table_name='categorias' AND column_name='slug'")
        )
        if not result.fetchone():
            conn.execute(text("ALTER TABLE categorias ADD COLUMN slug VARCHAR"))

        # Actualizar categorías legacy con LOWER() para case-insensitive
        conn.execute(text("UPDATE categorias SET slug = 'sin-categoria'     WHERE LOWER(nombre) = 'sin categoria'"))
        conn.execute(text("UPDATE categorias SET slug = 'limpieza-hogar'    WHERE LOWER(nombre) = 'cuidado hogar'"))
        conn.execute(text("UPDATE categorias SET slug = 'higiene-personal'  WHERE LOWER(nombre) = 'cuidado personal'"))
        # Fallback de seguridad para cualquier otro registro inesperado
        conn.execute(text("UPDATE categorias SET slug = 'legacy_' || id WHERE slug IS NULL"))

        conn.execute(text("ALTER TABLE categorias ALTER COLUMN slug SET NOT NULL"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_categorias_slug ON categorias (slug)"))
        conn.commit()

    # ── Paso 1: Mapeo de legacy_slug → slug oficial (¡Blindado contra Mayúsculas!) ──
    MAPEO_LEGACY = {
        "limpieza-hogar":   "limpieza_hogar",
        "higiene-personal": "higiene_personal",
        "sin-categoria":    "limpieza_hogar",
    }

    # ── Paso 2: Crear o actualizar cada categoría oficial ──
    creadas, actualizadas = [], []
    for miembro in CategoriaOficial:
        cat = (
            db.query(Categoria)
            .filter((Categoria.slug == miembro.slug) | (Categoria.nombre == miembro.nombre))
            .first()
        )
        if cat:
            if cat.slug != miembro.slug or cat.nombre != miembro.nombre:
                cat.nombre = miembro.nombre
                cat.slug   = miembro.slug
                actualizadas.append(miembro.nombre)
        else:
            db.add(Categoria(nombre=miembro.nombre, slug=miembro.slug))
            creadas.append(miembro.nombre)
    db.flush()

    # ── Paso 3: Migrar productos de categorías legacy → oficiales usando slug temporal ──
    cats_oficiales = {c.slug: c.id for c in db.query(Categoria).all()}
    slug_a_nombre_oficial = {m.slug: m.nombre for m in CategoriaOficial}

    for legacy_slug, target_slug in MAPEO_LEGACY.items():
        legacy_cat = db.query(Categoria).filter(Categoria.slug == legacy_slug).first()
        if not legacy_cat:
            continue

        target_id = cats_oficiales.get(target_slug)
        nombre_oficial = slug_a_nombre_oficial.get(target_slug)
        if not target_id or not nombre_oficial:
            continue

        afectados = (
            db.query(Producto)
            .filter(Producto.categoria_id == legacy_cat.id)
            .update({
                "categoria_id": target_id,
                "categoria": nombre_oficial,
            })
        )
        if afectados > 0:
            print(f"  Migrados {afectados} productos de slug legacy '{legacy_slug}' -> '{target_slug}'")

    # ── Paso 4: Eliminar categorías legacy huérfanas de forma segura ──
    legacy_rows = db.query(Categoria).filter(~Categoria.slug.in_(SLUGS_OFICIALES)).all()
    for row in legacy_rows:
        count = db.query(Producto).filter(Producto.categoria_id == row.id).count()
        if count == 0:
            db.delete(row)
            print(f"  Eliminada legacy huérfana: '{row.nombre}' (slug={row.slug})")
        else:
            print(f"  [WARN] '{row.nombre}' aún tiene {count} productos — no se elimina")

    db.commit()
    return {"status": "ok", "creadas": creadas, "actualizadas": actualizadas, "total": len(CategoriaOficial)}


# --- GESTION DE USUARIOS (ADMIN) ---


@app.get("/api/users", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db), current_user=Depends(get_current_admin_user)
):
    return db.query(User).all()


@app.post("/api/users", response_model=UserResponse)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    # Validar que username sea alfanumerico
    import re

    if not re.match(r"^[a-zA-Z0-9_]{3,30}$", user.username):
        raise HTTPException(
            status_code=400,
            detail="El username debe ser alfanumerico (3-30 caracteres, sin espacios).",
        )

    # Validar que el rol sea uno de los permitidos
    ROLES_VALIDOS = ["admin", "cliente_base", "distribuidor"]
    if user.rol not in ROLES_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Rol invalido. Debe ser uno de: {', '.join(ROLES_VALIDOS)}",
        )

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
        rol=user.rol,
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
            text(
                "SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users"
            )
        )
        db.commit()
        raise HTTPException(
            status_code=400, detail="Conflicto de llave unica al crear usuario."
        )

    base_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    activation_url = f"{base_url}/activate/{token}"
    if background_tasks:
        background_tasks.add_task(send_activation_email, user.email, activation_url)
    else:
        await send_activation_email(user.email, activation_url)

    return new_user


@app.delete("/api/users/{user_id}")
async def delete_user(
    user_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Evitar que el administrador se borre a sí mismo si solo hay uno
    if user.username == current_user.username:
        raise HTTPException(
            status_code=400,
            detail="No puedes eliminar tu propia cuenta de administrador.",
        )

    db.delete(user)
    db.commit()
    return {"status": "success", "message": "Usuario eliminado correctamente."}


@app.put("/api/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    """Actualiza el estado is_active de un usuario (toggle)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user.is_active = status_update.is_active
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_active": user.is_active,
    }


# ========================================================================
# MÓDULO DE INVENTARIO — Centro Operativo de Flujo de Mercancía
# ========================================================================


@app.get("/api/inventario/resumen")
async def inventario_resumen(
    db: Session = Depends(get_db), current_user=Depends(get_current_admin_user)
):
    """
    Dashboard KPIs: valor total de inventario, alertas de stock bajo,
    productos estancados y velocidad de venta promedio.
    """
    productos = db.query(Producto).all()

    # Valor total del inventario (stock * precio de cada producto) - blindado contra None
    valor_total = sum((p.stock or 0) * (p.precio or 0) for p in productos)

    # Productos con stock crítico (stock <= stockMin) - blindado contra None
    productos_criticos = [
        p for p in productos
        if (p.stock or 0) <= (p.stockMin if p.stockMin is not None else 0)
    ]
    alertas_count = len(productos_criticos)
    sin_stock_count = len([p for p in productos if (p.stock or 0) == 0])

    # Productos estancados: con stock > 0 pero sin ventas en los últimos 60 días
    hace_60_dias = datetime.utcnow() - timedelta(days=60)
    ids_con_venta_reciente = set()
    movimientos_recientes = (
        db.query(MovimientoInventario)
        .filter(
            MovimientoInventario.tipo == "VENTA",
            MovimientoInventario.fecha >= hace_60_dias,
        )
        .all()
    )
    for m in movimientos_recientes:
        ids_con_venta_reciente.add(m.producto_id)

    estancados = [
        p for p in productos if (p.stock or 0) > 0 and p.id not in ids_con_venta_reciente
    ]
    estancados_count = len(estancados)

    # ── Métricas de ventas enlazadas (solo APROBADA, excluye REEMBOLSADA/CANCELADA) ──
    ventas_activas = db.query(Venta).filter(Venta.estado == "APROBADA").all()
    total_ingresos = sum(v.total or 0 for v in ventas_activas)
    total_ventas_count = len(ventas_activas)

    ventas_reembolsadas = db.query(Venta).filter(Venta.estado == "REEMBOLSADA").count()

    # Unidades vendidas netas (APROBADA) desde venta_items
    unidades_vendidas_netas = (
        db.query(sql_func.coalesce(sql_func.sum(VentaItem.cantidad), 0))
        .join(Venta, VentaItem.venta_id == Venta.id)
        .filter(Venta.estado == "APROBADA")
        .scalar()
    )

    return {
        "valor_total": valor_total,
        "total_productos": len(productos),
        "alertas_stock_bajo": alertas_count,
        "sin_stock": sin_stock_count,
        "estancados": estancados_count,
        "total_ingresos": total_ingresos,
        "total_ventas": total_ventas_count,
        "reembolsos": ventas_reembolsadas,
        "unidades_vendidas": unidades_vendidas_netas,
    }


@app.get("/api/inventario/productos")
async def inventario_productos(
    db: Session = Depends(get_db), current_user=Depends(get_current_admin_user)
):
    """
    Tabla principal de inventario con métricas de rotación calculadas.
    Cada producto incluye: velocidad de venta (últimos 30 días), estado y unidades vendidas.
    """
    productos = db.query(Producto).all()

    hace_30_dias = datetime.utcnow() - timedelta(days=30)
    hace_60_dias = datetime.utcnow() - timedelta(days=60)

    # ── Ventas netas (30d) por producto desde venta_items + ventas APROBADAS ──
    ventas_30d_query = (
        db.query(
            VentaItem.producto_id,
            sql_func.coalesce(sql_func.sum(VentaItem.cantidad), 0).label("total_qty"),
        )
        .join(Venta, VentaItem.venta_id == Venta.id)
        .filter(Venta.estado == "APROBADA", Venta.fecha >= hace_30_dias)
        .group_by(VentaItem.producto_id)
        .all()
    )
    ventas_por_producto = {
        row.producto_id: int(row.total_qty) for row in ventas_30d_query
    }

    # ── Ventas totales (all-time) por producto, solo APROBADAS ──
    ventas_total_query = (
        db.query(
            VentaItem.producto_id,
            sql_func.coalesce(sql_func.sum(VentaItem.cantidad), 0).label("total_qty"),
        )
        .join(Venta, VentaItem.venta_id == Venta.id)
        .filter(Venta.estado == "APROBADA")
        .group_by(VentaItem.producto_id)
        .all()
    )
    ventas_totales_producto = {
        row.producto_id: int(row.total_qty) for row in ventas_total_query
    }

    # ── IDs con ventas activas en 60d (para detectar estancados) ──
    ventas_60d_query = (
        db.query(VentaItem.producto_id)
        .join(Venta, VentaItem.venta_id == Venta.id)
        .filter(Venta.estado == "APROBADA", Venta.fecha >= hace_60_dias)
        .distinct()
        .all()
    )
    ids_con_venta_60d = set(row.producto_id for row in ventas_60d_query)

    resultado = []
    for p in productos:
        unidades_vendidas_30d = ventas_por_producto.get(p.id, 0)
        velocidad_diaria = round(unidades_vendidas_30d / 30, 2)

        stock_actual = p.stock if p.stock is not None else 0
        stock_minimo = p.stockMin if p.stockMin is not None else 0

        # Determinar estado
        if stock_actual == 0:
            estado = "SIN_STOCK"
        elif stock_actual <= stock_minimo:
            estado = "CRITICO"
        elif stock_actual > 0 and p.id not in ids_con_venta_60d:
            estado = "ESTANCADO"
        else:
            estado = "OPTIMO"

        # Días de stock restante estimados - blindado contra None y división por cero
        dias_restantes = None
        if velocidad_diaria > 0 and (p.stock or 0) > 0:
            dias_restantes = round((p.stock or 0) / velocidad_diaria)

        resultado.append(
            {
                "id": p.id,
                "nombre": p.nombre,
                "categoria": p.categoria_rel.nombre if p.categoria_rel else p.categoria,
                "precio": p.precio,
                "stock": p.stock if p.stock is not None else 0,
                "stockMin": p.stockMin if p.stockMin is not None else 0,
                "ventas_30d": unidades_vendidas_30d,
                "total_vendidas": ventas_totales_producto.get(p.id, 0),
                "velocidad_diaria": velocidad_diaria,
                "dias_restantes": dias_restantes,
                "estado": estado,
            }
        )

    return resultado


@app.get("/api/inventario/movimientos/{producto_id}")
async def inventario_movimientos(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    """
    Trazabilidad: Historial completo de movimientos de un producto.
    Devuelve una línea de tiempo ordenada de más reciente a más antiguo.
    """
    producto = db.query(Producto).filter(Producto.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    movimientos = (
        db.query(MovimientoInventario)
        .filter(MovimientoInventario.producto_id == producto_id)
        .order_by(MovimientoInventario.fecha.desc())
        .limit(100)
        .all()
    )

    return {
        "producto": {
            "id": producto.id,
            "nombre": producto.nombre,
            "stock_actual": producto.stock,
            "stockMin": producto.stockMin,
        },
        "movimientos": [
            {
                "id": m.id,
                "tipo": m.tipo,
                "cantidad": m.cantidad,
                "stock_resultante": m.stock_resultante,
                "referencia_id": m.referencia_id,
                "nota": m.nota,
                "fecha": m.fecha.isoformat() if m.fecha else None,
            }
            for m in movimientos
        ],
    }


@app.post("/api/inventario/ajuste")
async def inventario_ajuste(
    ajuste: AjusteInventarioRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    """
    Registrar un ajuste manual de inventario: compra de stock, merma, devolución.
    """
    producto = db.query(Producto).filter(Producto.id == ajuste.producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    tipos_validos = ["ENTRADA_COMPRA", "AJUSTE_MERMA", "DEVOLUCION"]
    if ajuste.tipo not in tipos_validos:
        raise HTTPException(
            status_code=400, detail=f"Tipo inválido. Debe ser uno de: {tipos_validos}"
        )

    # Determinar signo según el tipo
    if ajuste.tipo in ["ENTRADA_COMPRA", "DEVOLUCION"]:
        cambio = abs(ajuste.cantidad)
    else:  # AJUSTE_MERMA
        cambio = -abs(ajuste.cantidad)
        if producto.stock + cambio < 0:
            raise HTTPException(
                status_code=400,
                detail="La merma no puede dejar el stock por debajo de 0",
            )

    producto.stock += cambio

    movimiento = MovimientoInventario(
        producto_id=ajuste.producto_id,
        tipo=ajuste.tipo,
        cantidad=cambio,
        stock_resultante=producto.stock,
        nota=ajuste.nota or f"Ajuste manual: {ajuste.tipo}",
    )
    db.add(movimiento)
    db.commit()
    db.refresh(producto)

    return {
        "status": "success",
        "producto_id": producto.id,
        "nuevo_stock": producto.stock,
        "movimiento_tipo": ajuste.tipo,
    }


# ========================================================================
# MÓDULO DE REEMBOLSOS — Consistencia Transaccional Venta ↔ Inventario
# ========================================================================


@app.post("/api/ventas/reembolso")
async def procesar_reembolso(
    req: ReembolsoRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    """
    Procesa un reembolso en una ÚNICA transacción ACID:
    1. Valida que la venta exista y esté en estado APROBADA
    2. Devuelve las unidades al stock de cada producto
    3. Registra movimientos de inventario tipo DEVOLUCION
    4. Marca la venta como REEMBOLSADA
    Soporta reembolso total (sin items) o parcial (con items específicos).
    """
    venta = db.query(Venta).filter(Venta.id == req.venta_id).first()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada.")

    if venta.estado != "APROBADA":
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden reembolsar ventas APROBADAS. Estado actual: {venta.estado}",
        )

    try:
        # Parsear items originales de la venta
        items_originales = json.loads(venta.items) if venta.items else []

        # Determinar qué items reembolsar
        if req.items:
            # Reembolso parcial: validar que los items existan en la venta original
            items_a_devolver = []
            for req_item in req.items:
                original = next(
                    (
                        i
                        for i in items_originales
                        if i["producto_id"] == req_item.producto_id
                    ),
                    None,
                )
                if not original:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Producto ID {req_item.producto_id} no existe en la venta #{req.venta_id}.",
                    )
                if req_item.cantidad > original["cantidad"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cantidad a devolver ({req_item.cantidad}) excede la vendida ({original['cantidad']}) para producto ID {req_item.producto_id}.",
                    )
                items_a_devolver.append(
                    {
                        "producto_id": req_item.producto_id,
                        "cantidad": req_item.cantidad,
                        "precio": original["precio"],
                    }
                )
        else:
            # Reembolso total: devolver todos los items
            items_a_devolver = [
                {
                    "producto_id": i["producto_id"],
                    "cantidad": i["cantidad"],
                    "precio": i["precio"],
                }
                for i in items_originales
            ]

        monto_reembolsado = 0.0
        productos_actualizados = []

        for item in items_a_devolver:
            producto = (
                db.query(Producto).filter(Producto.id == item["producto_id"]).first()
            )
            if not producto:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto ID {item['producto_id']} ya no existe en el catálogo.",
                )

            # a) Sumar unidades devueltas al stock
            producto.stock += item["cantidad"]

            # b) Registrar movimiento de inventario tipo DEVOLUCION
            movimiento = MovimientoInventario(
                producto_id=item["producto_id"],
                tipo="DEVOLUCION",
                cantidad=item["cantidad"],  # Positivo = entrada
                stock_resultante=producto.stock,
                referencia_id=venta.id,
                nota=req.motivo or f"Reembolso de Venta #{venta.id}",
            )
            db.add(movimiento)

            monto_reembolsado += item["precio"] * item["cantidad"]
            productos_actualizados.append(
                {
                    "producto_id": producto.id,
                    "nombre": producto.nombre,
                    "unidades_devueltas": item["cantidad"],
                    "nuevo_stock": producto.stock,
                }
            )

        # c) Actualizar estado de la venta
        venta.estado = "REEMBOLSADA"

        # Commit atómico: stock + movimientos + estado de venta
        db.commit()

        return {
            "status": "success",
            "venta_id": venta.id,
            "estado_anterior": "APROBADA",
            "estado_nuevo": "REEMBOLSADA",
            "monto_reembolsado": monto_reembolsado,
            "productos_actualizados": productos_actualizados,
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al procesar reembolso: {str(e)}",
        )


@app.get("/api/ventas/historial")
async def get_ventas_historial(
    db: Session = Depends(get_db), current_user=Depends(get_current_admin_user)
):
    """Historial completo de ventas incluyendo todos los estados (para admin)."""
    ventas = db.query(Venta).order_by(Venta.fecha.desc()).limit(200).all()
    resultado = []
    for v in ventas:
        resultado.append(
            {
                "id": v.id,
                "total": v.total,
                "estado": v.estado,
                "metodo_pago": v.metodo_pago,
                "referencia_pago": v.referencia_pago,
                "fecha": v.fecha.isoformat() if v.fecha else None,
                "items": json.loads(v.items) if v.items else [],
            }
        )
    return resultado


@app.get("/api/inventario/alertas")
async def inventario_alertas(
    db: Session = Depends(get_db), current_user=Depends(get_current_admin_user)
):
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

        resultado.append(
            {
                "id": p.id,
                "nombre": p.nombre,
                "categoria": p.categoria_rel.nombre if p.categoria_rel else p.categoria,
                "stock": p.stock,
                "stockMin": p.stockMin,
                "severidad": severidad,
                "mensaje": mensaje,
            }
        )

    return resultado


# ========================================================================
# MÓDULO 4: PEDIDOS PÚBLICOS — Nequi Contra Entrega
# ========================================================================


# Número Nequi de la propietaria (configurable)
NEQUI_DUENA = os.getenv("NEQUI_DUENA", "3123456789")
NEQUI_PROPIETARIA = os.getenv("NEQUI_PROPIETARIA", "Élan Pure")


def _generar_guia() -> str:
    """Genera un código de guía único con formato ELAN-XXXXXX."""
    import secrets
    codigo = secrets.token_hex(3).upper()  # 6 caracteres hex
    return f"ELAN-{codigo}"


@app.post("/api/pedidos", status_code=201)
async def crear_pedido(
    req: CrearPedidoRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Crea un pedido público de Nequi Contra Entrega.
    Si el usuario está autenticado, vincula el pedido a su cuenta.
    NO descuenta stock (eso ocurre al aprobar).
    Genera un número de guía único para rastreo.
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="El carrito está vacío.")

    # Validar número Nequi del comprador
    import re
    if not re.match(r"^3[0-9]{9}$", req.nequi_celular):
        raise HTTPException(
            status_code=400,
            detail="Número Nequi inválido. Debe ser 10 dígitos comenzando por 3."
        )

    # Validar productos y calcular total (sin descontar stock)
    total_pedido = 0.0
    items_validados = []

    for item in req.items:
        producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
        if not producto:
            raise HTTPException(
                status_code=404,
                detail=f"Producto con ID {item.producto_id} no encontrado."
            )
        if producto.stock < item.cantidad:
            raise HTTPException(
                status_code=409,
                detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, Solicitado: {item.cantidad}"
            )
        precio_real = producto.precio
        subtotal = precio_real * item.cantidad
        total_pedido += subtotal
        items_validados.append({
            "producto_id": item.producto_id,
            "nombre_producto": producto.nombre,
            "cantidad": item.cantidad,
            "precio_unitario": precio_real,
            "subtotal": subtotal,
        })

    # Generar guía única
    guia = _generar_guia()
    # Asegurar unicidad
    while db.query(Pedido).filter(Pedido.guia_rastreo == guia).first():
        guia = _generar_guia()

    try:
        nuevo_pedido = Pedido(
            user_id=current_user.id if current_user else None,
            guia_rastreo=guia,
            cliente_nombre=req.cliente_nombre,
            cliente_telefono=req.cliente_telefono,
            cliente_direccion=req.cliente_direccion,
            cliente_ciudad=req.cliente_ciudad,
            cliente_email=req.cliente_email,
            nequi_celular=req.nequi_celular,
            total=total_pedido,
            estado="PENDIENTE_NEQUI",
        )
        db.add(nuevo_pedido)
        db.flush()

        for item_data in items_validados:
            detalle = PedidoItem(
                pedido_id=nuevo_pedido.id,
                producto_id=item_data["producto_id"],
                nombre_producto=item_data["nombre_producto"],
                cantidad=item_data["cantidad"],
                precio_unitario=item_data["precio_unitario"],
                subtotal=item_data["subtotal"],
            )
            db.add(detalle)

        db.commit()
        db.refresh(nuevo_pedido)

        return {
            "status": "success",
            "guia_rastreo": guia,
            "total": total_pedido,
            "nequi_duena": NEQUI_DUENA,
            "propietario_nequi": NEQUI_PROPIETARIA,
            "mensaje": f"Pedido registrado exitosamente. Transfiere ${total_pedido:,.0f} al Nequi {NEQUI_DUENA} para confirmar tu pedido.",
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error interno al crear el pedido: {str(e)}"
        )


@app.get("/api/pedidos/rastreo/{guia}")
async def rastrear_pedido(guia: str, db: Session = Depends(get_db)):
    """
    Consulta pública del estado de un pedido por número de guía.
    Oculta datos sensibles (dirección exacta, email completo).
    """
    pedido = db.query(Pedido).filter(Pedido.guia_rastreo == guia.upper().strip()).first()
    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="No se encontró ningún pedido con esa guía. Verifica el número e intenta de nuevo."
        )

    # Obtener items del pedido
    items = db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido.id).all()

    return {
        "guia_rastreo": pedido.guia_rastreo,
        "estado": pedido.estado,
        "total": pedido.total,
        "ciudad": pedido.cliente_ciudad,
        "cliente_nombre": pedido.cliente_nombre,
        "fecha_creacion": pedido.fecha_creacion.isoformat() if pedido.fecha_creacion else None,
        "fecha_actualizacion": pedido.fecha_actualizacion.isoformat() if pedido.fecha_actualizacion else None,
        "items": [
            {
                "nombre_producto": it.nombre_producto,
                "cantidad": it.cantidad,
                "precio_unitario": it.precio_unitario,
                "subtotal": it.subtotal,
            }
            for it in items
        ],
    }


@app.get("/api/pedidos/mis-pedidos")
async def mis_pedidos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retorna los pedidos vinculados al usuario autenticado (cliente/distribuidor)."""
    pedidos = (
        db.query(Pedido)
        .filter(Pedido.user_id == current_user.id)
        .order_by(Pedido.fecha_creacion.desc())
        .all()
    )
    result = []
    for p in pedidos:
        items = db.query(PedidoItem).filter(PedidoItem.pedido_id == p.id).all()
        result.append({
            "id": p.id,
            "guia_rastreo": p.guia_rastreo,
            "total": p.total,
            "estado": p.estado,
            "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
            "fecha_actualizacion": p.fecha_actualizacion.isoformat() if p.fecha_actualizacion else None,
            "items": [
                {
                    "nombre_producto": it.nombre_producto,
                    "cantidad": it.cantidad,
                    "precio_unitario": it.precio_unitario,
                    "subtotal": it.subtotal,
                }
                for it in items
            ],
        })
    return result


# --- ADMINISTRACIÓN DE PEDIDOS (requiere autenticación) ---


@app.get("/api/admin/pedidos")
async def listar_pedidos(
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    """Lista todos los pedidos con filtro opcional por estado."""
    query = db.query(Pedido)
    if estado:
        query = query.filter(Pedido.estado == estado.upper())
    pedidos = query.order_by(Pedido.fecha_creacion.desc()).all()

    resultado = []
    for p in pedidos:
        items = db.query(PedidoItem).filter(PedidoItem.pedido_id == p.id).all()
        resultado.append({
            "id": p.id,
            "guia_rastreo": p.guia_rastreo,
            "cliente_nombre": p.cliente_nombre,
            "cliente_telefono": p.cliente_telefono,
            "cliente_direccion": p.cliente_direccion,
            "cliente_ciudad": p.cliente_ciudad,
            "cliente_email": p.cliente_email,
            "nequi_celular": p.nequi_celular,
            "total": p.total,
            "estado": p.estado,
            "fecha_creacion": p.fecha_creacion.isoformat() if p.fecha_creacion else None,
            "fecha_actualizacion": p.fecha_actualizacion.isoformat() if p.fecha_actualizacion else None,
            "items": [
                {
                    "producto_id": it.producto_id,
                    "nombre_producto": it.nombre_producto,
                    "cantidad": it.cantidad,
                    "precio_unitario": it.precio_unitario,
                    "subtotal": it.subtotal,
                }
                for it in items
            ],
        })
    return resultado


@app.post("/api/admin/pedidos/{pedido_id}/aprobar")
async def aprobar_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    """
    Aprueba un pedido PENDIENTE_NEQUI:
    1. Verifica estado PENDIENTE_NEQUI
    2. Descuenta stock de cada producto
    3. Crea registro en tabla 'ventas' (para analíticas)
    4. Registra VentaItems y MovimientosInventario
    5. Cambia estado del pedido a APROBADO
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")
    if pedido.estado != "PENDIENTE_NEQUI":
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden aprobar pedidos en estado PENDIENTE_NEQUI. Estado actual: {pedido.estado}"
        )

    items_pedido = db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido.id).all()

    try:
        # Validar y descontar stock
        items_para_venta = []
        for item in items_pedido:
            producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
            if not producto:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto ID {item.producto_id} ('{item.nombre_producto}') ya no existe en el sistema."
                )
            if producto.stock < item.cantidad:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}, Requerido: {item.cantidad}"
                )
            producto.stock -= item.cantidad
            items_para_venta.append({
                "producto_id": item.producto_id,
                "nombre_producto": item.nombre_producto,
                "cantidad": item.cantidad,
                "precio": item.precio_unitario,
            })

        # Crear registro de Venta (para analíticas y dashboard)
        nueva_venta = Venta(
            items=json.dumps(items_para_venta),
            total=pedido.total,
            metodo_pago="NEQUI_CONTRA_ENTREGA",
            estado="APROBADA",
            referencia_pago=pedido.guia_rastreo,
        )
        db.add(nueva_venta)
        db.flush()

        # Registrar VentaItems y movimientos de inventario
        for item in items_pedido:
            producto = db.query(Producto).filter(Producto.id == item.producto_id).first()

            detalle_venta = VentaItem(
                venta_id=nueva_venta.id,
                producto_id=item.producto_id,
                nombre_producto=item.nombre_producto,
                cantidad=item.cantidad,
                precio_unitario=item.precio_unitario,
                subtotal=item.subtotal,
            )
            db.add(detalle_venta)

            movimiento = MovimientoInventario(
                producto_id=item.producto_id,
                tipo="VENTA",
                cantidad=-item.cantidad,
                stock_resultante=producto.stock,
                referencia_id=nueva_venta.id,
                nota=f"Pedido #{pedido.guia_rastreo} aprobado",
            )
            db.add(movimiento)

        # Cambiar estado del pedido
        pedido.estado = "APROBADO"
        db.commit()

        return {
            "status": "success",
            "mensaje": f"Pedido {pedido.guia_rastreo} aprobado. Venta #{nueva_venta.id} generada.",
            "venta_id": nueva_venta.id,
            "guia_rastreo": pedido.guia_rastreo,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error interno al aprobar pedido: {str(e)}"
        )


@app.put("/api/admin/pedidos/{pedido_id}/estado")
async def actualizar_estado_pedido(
    pedido_id: int,
    req: ActualizarEstadoPedidoRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin_user),
):
    """
    Actualiza el estado de un pedido (DESPACHADO, ENTREGADO, CANCELADO).
    Si se cancela desde APROBADO, restaura el stock y registra movimiento correctivo.
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado.")

    nuevo_estado = req.nuevo_estado.upper()
    estados_validos = ["DESPACHADO", "ENTREGADO", "CANCELADO"]
    if nuevo_estado not in estados_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Estados permitidos: {', '.join(estados_validos)}"
        )

    # Reglas de transición
    estado_actual = pedido.estado
    transiciones_validas = {
        "PENDIENTE_NEQUI": ["CANCELADO"],
        "APROBADO": ["DESPACHADO", "CANCELADO"],
        "DESPACHADO": ["ENTREGADO", "CANCELADO"],
    }
    permitidos = transiciones_validas.get(estado_actual, [])
    if nuevo_estado not in permitidos:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede cambiar de '{estado_actual}' a '{nuevo_estado}'. Transiciones permitidas: {', '.join(permitidos) if permitidos else 'ninguna'}"
        )

    try:
        # Si se cancela desde APROBADO, restaurar stock
        if nuevo_estado == "CANCELADO" and estado_actual == "APROBADO":
            items_pedido = db.query(PedidoItem).filter(PedidoItem.pedido_id == pedido.id).all()
            for item in items_pedido:
                producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
                if producto:
                    producto.stock += item.cantidad
                    movimiento = MovimientoInventario(
                        producto_id=item.producto_id,
                        tipo="DEVOLUCION",
                        cantidad=item.cantidad,
                        stock_resultante=producto.stock,
                        referencia_id=pedido.id,
                        nota=f"Cancelación pedido #{pedido.guia_rastreo}",
                    )
                    db.add(movimiento)

        pedido.estado = nuevo_estado
        db.commit()

        return {
            "status": "success",
            "guia_rastreo": pedido.guia_rastreo,
            "estado_anterior": estado_actual,
            "estado_nuevo": nuevo_estado,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error al actualizar estado: {str(e)}"
        )


# 4. Optimización de Arranque (Solución a SpawnProcess/Python 3.14)
# 3. Estabilidad y protección de arranque (SpawnProcess en Python 3.14+)
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
