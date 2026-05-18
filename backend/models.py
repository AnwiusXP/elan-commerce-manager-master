from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=False)
    activation_token = Column(String, nullable=True)
    activation_expires_at = Column(DateTime, nullable=True)

    ventas = relationship("Venta", back_populates="usuario")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token = Column(String, index=True)
    expires_at = Column(DateTime)

class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    categoria = Column(String)
    precio = Column(Float)
    stock = Column(Integer)
    stockMin = Column(Integer)

    movimientos = relationship("MovimientoInventario", back_populates="producto")
    venta_items = relationship("VentaItem", back_populates="producto")

class Venta(Base):
    __tablename__ = "ventas"
    __table_args__ = (
        Index('ix_ventas_estado', 'estado'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    items = Column(Text)  # JSON string (legacy, se mantiene por compatibilidad)
    total = Column(Float)
    metodo_pago = Column(String, default="DIRECTO")
    estado = Column(String, default="APROBADA")  # APROBADA | RECHAZADA | REEMBOLSADA | CANCELADA
    referencia_pago = Column(String, nullable=True)
    fecha = Column(DateTime, default=func.now())

    usuario = relationship("User", back_populates="ventas")
    detalles = relationship("VentaItem", back_populates="venta", cascade="all, delete-orphan")


class VentaItem(Base):
    """Tabla normalizada de líneas de venta. Enlaza cada Venta con sus Productos
    mediante FK, permitiendo cálculos dinámicos de unidades vendidas por producto."""
    __tablename__ = "venta_items"

    id = Column(Integer, primary_key=True, index=True)
    venta_id = Column(Integer, ForeignKey("ventas.id", ondelete="CASCADE"), nullable=False, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False, index=True)
    nombre_producto = Column(String, nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto", back_populates="venta_items")

class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"

    id = Column(Integer, primary_key=True, index=True)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    tipo = Column(String, nullable=False)        # VENTA, ENTRADA_COMPRA, AJUSTE_MERMA, DEVOLUCION
    cantidad = Column(Integer, nullable=False)    # Positivo = entrada, Negativo = salida
    stock_resultante = Column(Integer, nullable=False)
    referencia_id = Column(Integer, nullable=True)  # ID de la venta asociada, si aplica
    nota = Column(String, nullable=True)
    fecha = Column(DateTime, default=func.now())

    producto = relationship("Producto", back_populates="movimientos")