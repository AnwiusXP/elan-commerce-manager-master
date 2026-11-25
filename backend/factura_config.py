import os

# Configuración institucional del emisor (Facturación tipo DIAN)
EMISOR_NOMBRE = os.getenv("FACTURA_EMISOR_NOMBRE", "Elan Commerce S.A.S.")
EMISOR_NIT = os.getenv("FACTURA_EMISOR_NIT", "901.482.910-4")
EMISOR_REGIMEN = os.getenv("FACTURA_EMISOR_REGIMEN", "Responsable de IVA")
EMISOR_DIRECCION = os.getenv("FACTURA_EMISOR_DIRECCION", "Carrera 43A # 18 Sur - 135")
EMISOR_CIUDAD = os.getenv("FACTURA_EMISOR_CIUDAD", "Medellín, Antioquia")
EMISOR_TELEFONO = os.getenv("FACTURA_EMISOR_TELEFONO", "+57 (604) 448-1234")
EMISOR_EMAIL = os.getenv("FACTURA_EMISOR_EMAIL", "facturacion@elancommerce.com")
EMISOR_ACTIVIDAD_ECONOMICA = os.getenv("FACTURA_EMISOR_ACTIVIDAD", "CIIU 4791 - Comercio al por menor por internet")

# Parámetros de numeración y tributación
RESOLUCION_DIAN = os.getenv(
    "FACTURA_RESOLUCION_DIAN",
    "Resolución DIAN N° 18764000001 de 2026-01-01 (Prefijo ECM desde 1 hasta 100000, Vigencia 24 meses)"
)
PREFIJO_FACTURA = os.getenv("FACTURA_PREFIJO", "ECM")
IVA_PORCENTAJE = float(os.getenv("FACTURA_IVA_PORCENTAJE", "0.19"))
MONEDA = "COP"
