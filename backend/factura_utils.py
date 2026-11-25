"""
Utilidades para generación de facturas tipo DIAN en PDF (ReportLab) y XML (UBL 2.1).
Módulo de Facturación de Elan Commerce Manager (ECM).
"""
from __future__ import annotations
import io
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional, Any, TYPE_CHECKING
import xml.etree.ElementTree as ET

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

import factura_config as config

if TYPE_CHECKING:
    from models import Venta, VentaItem, Pedido, User


@dataclass
class FacturaItemData:
    item_id: int
    nombre: str
    cantidad: int
    precio_unitario: float
    subtotal: float


@dataclass
class FacturaData:
    # Identificación
    numero_factura: str
    venta_id: int
    fecha_emision: datetime
    fecha_vencimiento: datetime
    origen_venta: str

    # Emisor (Elan Commerce)
    emisor_nombre: str
    emisor_nit: str
    emisor_regimen: str
    emisor_direccion: str
    emisor_ciudad: str
    emisor_telefono: str
    emisor_email: str
    emisor_actividad: str
    resolucion_dian: str

    # Comprador
    comprador_nombre: str
    comprador_documento: str
    comprador_tipo_doc: str
    comprador_direccion: str
    comprador_ciudad: str
    comprador_telefono: str
    comprador_email: str

    # Ítems y Totales
    items: List[FacturaItemData]
    subtotal: float
    iva_porcentaje: float
    iva_monto: float
    total: float

    # Pago y Estado
    metodo_pago: str
    referencia_pago: Optional[str]
    estado_venta: str
    moneda: str = config.MONEDA


def build_factura_data(venta: Venta, db) -> FacturaData:
    """
    Construye la estructura unificada FacturaData a partir de una Venta existente,
    resolviendo los datos del cliente desde Venta, Pedido o User con fallback seguro.
    """
    # 1. Resolver datos del cliente
    cliente_nombre = venta.cliente_nombre
    cliente_doc = venta.cliente_documento
    cliente_tipo_doc = venta.cliente_tipo_doc or "CC"
    cliente_dir = venta.cliente_direccion or "Dirección no especificada"
    cliente_ciudad = venta.cliente_ciudad or "Medellín, Colombia"
    cliente_tel = venta.cliente_telefono or "No especificado"
    cliente_email = venta.cliente_email or "consumidor@elancommerce.com"

    # Si no tiene datos en la venta, intentar buscar pedido vinculado por referencia_pago (guía)
    if not cliente_nombre and venta.referencia_pago:
        pedido = db.query(Pedido).filter(Pedido.guia_rastreo == venta.referencia_pago).first()
        if pedido:
            cliente_nombre = pedido.cliente_nombre
            cliente_doc = pedido.nequi_celular or "No registrado"
            cliente_tipo_doc = "CC"
            cliente_dir = pedido.cliente_direccion or cliente_dir
            cliente_ciudad = pedido.cliente_ciudad or cliente_ciudad
            cliente_tel = pedido.cliente_telefono or pedido.nequi_celular or cliente_tel
            cliente_email = pedido.cliente_email or cliente_email

    # Si aún no tiene nombre pero tiene user_id vinculado
    if not cliente_nombre and venta.user_id:
        user = db.query(User).filter(User.id == venta.user_id).first()
        if user:
            cliente_nombre = user.username
            cliente_email = user.email
            cliente_doc = f"USR-{user.id:05d}"
            cliente_tipo_doc = "CC"

    # Fallback final a Consumidor Final (estándar DIAN)
    if not cliente_nombre:
        cliente_nombre = "CONSUMIDOR FINAL"
        cliente_doc = "222222222222"
        cliente_tipo_doc = "CC"
        cliente_dir = "Mostrador / Sin registro"
        cliente_ciudad = "Colombia"
        cliente_tel = "N/A"
        cliente_email = "consumidor.final@dian.gov.co"

    # 2. Resolver ítems de la venta
    items_data: List[FacturaItemData] = []
    detalles = venta.detalles if venta.detalles else []

    if detalles:
        for idx, d in enumerate(detalles, start=1):
            items_data.append(
                FacturaItemData(
                    item_id=idx,
                    nombre=d.nombre_producto,
                    cantidad=d.cantidad,
                    precio_unitario=d.precio_unitario,
                    subtotal=d.subtotal or (d.precio_unitario * d.cantidad),
                )
            )
    elif venta.items:
        try:
            parsed_items = json.loads(venta.items)
            for idx, item in enumerate(parsed_items, start=1):
                qty = item.get("cantidad", 1)
                precio = item.get("precio", 0.0)
                items_data.append(
                    FacturaItemData(
                        item_id=idx,
                        nombre=item.get("nombre_producto", f"Producto #{item.get('producto_id', idx)}"),
                        cantidad=qty,
                        precio_unitario=precio,
                        subtotal=precio * qty,
                    )
                )
        except Exception:
            pass

    if not items_data:
        items_data.append(
            FacturaItemData(
                item_id=1,
                nombre="Venta de mercancía general",
                cantidad=1,
                precio_unitario=venta.total or 0.0,
                subtotal=venta.total or 0.0,
            )
        )

    # 3. Cálculos impositivos consistentes con el total registrado
    total = float(venta.total or 0.0)
    iva_factor = 1.0 + config.IVA_PORCENTAJE
    subtotal = round(total / iva_factor, 2)
    iva_monto = round(total - subtotal, 2)

    fecha_emision = venta.fecha or datetime.utcnow()
    fecha_vencimiento = fecha_emision + timedelta(days=30)
    numero_factura = f"{config.PREFIJO_FACTURA}-{venta.id:08d}"

    return FacturaData(
        numero_factura=numero_factura,
        venta_id=venta.id,
        fecha_emision=fecha_emision,
        fecha_vencimiento=fecha_vencimiento,
        origen_venta=getattr(venta, "origen_venta", "WEB") or "WEB",
        emisor_nombre=config.EMISOR_NOMBRE,
        emisor_nit=config.EMISOR_NIT,
        emisor_regimen=config.EMISOR_REGIMEN,
        emisor_direccion=config.EMISOR_DIRECCION,
        emisor_ciudad=config.EMISOR_CIUDAD,
        emisor_telefono=config.EMISOR_TELEFONO,
        emisor_email=config.EMISOR_EMAIL,
        emisor_actividad=config.EMISOR_ACTIVIDAD_ECONOMICA,
        resolucion_dian=config.RESOLUCION_DIAN,
        comprador_nombre=cliente_nombre,
        comprador_documento=cliente_doc,
        comprador_tipo_doc=cliente_tipo_doc,
        comprador_direccion=cliente_dir,
        comprador_ciudad=cliente_ciudad,
        comprador_telefono=cliente_tel,
        comprador_email=cliente_email,
        items=items_data,
        subtotal=subtotal,
        iva_porcentaje=config.IVA_PORCENTAJE,
        iva_monto=iva_monto,
        total=total,
        metodo_pago=venta.metodo_pago or "EFECTIVO",
        referencia_pago=venta.referencia_pago,
        estado_venta=venta.estado or "APROBADA",
    )


def render_factura_pdf(f: FacturaData) -> bytes:
    """
    Genera el archivo PDF vectorial en memoria con ReportLab PLATYPUS
    con estructura y diseño formal tipo DIAN.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Colores institucionales
    COLOR_PRIMARY = colors.HexColor("#1b2533")      # Azul oscuro institucional
    COLOR_ACCENT = colors.HexColor("#10b981")       # Verde esmeralda Elan
    COLOR_BG_LIGHT = colors.HexColor("#f8fafc")     # Gris fondo claro
    COLOR_BORDER = colors.HexColor("#e2e8f0")       # Borde suave
    COLOR_MUTED = colors.HexColor("#64748b")        # Texto secundario

    # Estilos de tipografía
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        textColor=COLOR_PRIMARY,
        leading=18,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=COLOR_ACCENT,
        leading=14,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        textColor=COLOR_PRIMARY,
        leading=11.5,
    )
    bold_style = ParagraphStyle(
        "DocBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        textColor=COLOR_PRIMARY,
        leading=11.5,
    )
    muted_style = ParagraphStyle(
        "DocMuted",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        textColor=COLOR_MUTED,
        leading=10,
    )
    right_bold = ParagraphStyle(
        "DocRightBold",
        parent=bold_style,
        alignment=TA_RIGHT,
    )
    right_body = ParagraphStyle(
        "DocRightBody",
        parent=body_style,
        alignment=TA_RIGHT,
    )
    center_muted = ParagraphStyle(
        "DocCenterMuted",
        parent=muted_style,
        alignment=TA_CENTER,
    )

    story = []

    # ── 1. ENCABEZADO Y CAJA DE FACTURA ──
    emisor_html = f"""
    <b>{f.emisor_nombre}</b><br/>
    NIT: {f.emisor_nit} | {f.emisor_regimen}<br/>
    {f.emisor_actividad}<br/>
    Dirección: {f.emisor_direccion} — {f.emisor_ciudad}<br/>
    Teléfono: {f.emisor_telefono} | Email: {f.emisor_email}
    """

    caja_factura_html = f"""
    <font color="{COLOR_ACCENT.hexval()}"><b>FACTURA ELECTRÓNICA DE VENTA</b></font><br/>
    <b>N° {f.numero_factura}</b><br/>
    <b>Fecha Emisión:</b> {f.fecha_emision.strftime('%Y-%m-%d %H:%M')}<br/>
    <b>Fecha Vencimiento:</b> {f.fecha_vencimiento.strftime('%Y-%m-%d')}<br/>
    <b>Forma de Pago:</b> {f.metodo_pago}
    """

    header_table = Table(
        [
            [Paragraph(emisor_html, body_style), Paragraph(caja_factura_html, right_body)]
        ],
        colWidths=[330, 210],
    )
    header_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (1, 0), (1, 0), COLOR_BG_LIGHT),
            ("BOX", (1, 0), (1, 0), 1, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (1, 0), (1, 0), 12),
            ("RIGHTPADDING", (1, 0), (1, 0), 12),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 8))

    # Barra divisoria
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_ACCENT, spaceBefore=4, spaceAfter=8))

    # ── 2. DATOS DEL CLIENTE / ADQUIRENTE ──
    comprador_col1 = f"""
    <b>DATOS DEL ADQUIRENTE</b><br/>
    <b>Razón Social / Nombre:</b> {f.comprador_nombre}<br/>
    <b>{f.comprador_tipo_doc}:</b> {f.comprador_documento}<br/>
    <b>Dirección:</b> {f.comprador_direccion}
    """
    comprador_col2 = f"""
    <br/>
    <b>Ciudad:</b> {f.comprador_ciudad}<br/>
    <b>Teléfono:</b> {f.comprador_telefono}<br/>
    <b>Email:</b> {f.comprador_email}
    """

    comprador_table = Table(
        [
            [Paragraph(comprador_col1, body_style), Paragraph(comprador_col2, body_style)]
        ],
        colWidths=[290, 250],
    )
    comprador_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ])
    )
    story.append(comprador_table)
    story.append(Spacer(1, 12))

    # ── 3. TABLA DE ÍTEMS ──
    items_header = [
        Paragraph("<b>#</b>", bold_style),
        Paragraph("<b>Descripción del Producto</b>", bold_style),
        Paragraph("<b>Cant.</b>", right_bold),
        Paragraph("<b>Precio Unit.</b>", right_bold),
        Paragraph("<b>Subtotal</b>", right_bold),
    ]

    items_rows = [items_header]
    for it in f.items:
        items_rows.append([
            Paragraph(str(it.item_id), muted_style),
            Paragraph(it.nombre, body_style),
            Paragraph(str(it.cantidad), right_body),
            Paragraph(f"${it.precio_unitario:,.0f}", right_body),
            Paragraph(f"${it.subtotal:,.0f}", right_body),
        ])

    items_table = Table(items_rows, colWidths=[25, 275, 55, 95, 90])
    items_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
            ("TOPPADDING", (0, 1), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
        ])
    )
    # Cambiar estilo de texto del header a blanco
    for i in range(len(items_header)):
        items_header[i].style.textColor = colors.white

    story.append(items_table)
    story.append(Spacer(1, 10))

    # ── 4. RESUMEN FINANCIERO Y TOTALES ──
    ref_info = f"<b>Ref. Pago:</b> {f.referencia_pago or 'Sin referencia'}<br/>" if f.referencia_pago else ""
    info_adicional = f"""
    <b>Información Adicional:</b><br/>
    <b>Origen:</b> {f.origen_venta} | <b>Estado:</b> {f.estado_venta}<br/>
    {ref_info}
    <b>Moneda:</b> {f.moneda} (Pesos Colombianos)<br/>
    <font size="7">{f.resolucion_dian}</font>
    """

    totales_data = [
        [Paragraph("<b>Subtotal (Base Gravable):</b>", body_style), Paragraph(f"${f.subtotal:,.2f}", right_body)],
        [Paragraph("<b>IVA (19%):</b>", body_style), Paragraph(f"${f.iva_monto:,.2f}", right_body)],
        [Paragraph("<b>TOTAL A PAGAR:</b>", ParagraphStyle("TotBold", parent=bold_style, fontSize=11, textColor=COLOR_ACCENT)),
         Paragraph(f"<b>${f.total:,.0f} COP</b>", ParagraphStyle("TotVal", parent=right_bold, fontSize=11, textColor=COLOR_ACCENT))],
    ]
    totales_table = Table(totales_data, colWidths=[140, 100])
    totales_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("LINEBELOW", (0, 1), (-1, 1), 1, COLOR_PRIMARY),
            ("BACKGROUND", (0, 2), (-1, 2), COLOR_BG_LIGHT),
        ])
    )

    resumen_table = Table(
        [
            [Paragraph(info_adicional, body_style), totales_table]
        ],
        colWidths=[300, 240],
    )
    resumen_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (1, 0), (1, 0), 1, COLOR_BORDER),
            ("LEFTPADDING", (1, 0), (1, 0), 10),
            ("RIGHTPADDING", (1, 0), (1, 0), 10),
            ("TOPPADDING", (1, 0), (1, 0), 6),
            ("BOTTOMPADDING", (1, 0), (1, 0), 6),
        ])
    )
    story.append(resumen_table)
    story.append(Spacer(1, 16))

    # ── 5. PIE DE PÁGINA INSTITUCIONAL DIAN ──
    pie_texto = """
    Representación gráfica de factura electrónica expedida conforme a las disposiciones técnicas vigentes de la DIAN.
    Documento generado por <b>Elan Commerce Manager (ECM)</b>. No constituye certificado tributario oficial.
    """
    story.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_BORDER, spaceBefore=4, spaceAfter=6))
    story.append(Paragraph(pie_texto, center_muted))

    doc.build(story)
    return buffer.getvalue()


def render_factura_xml(f: FacturaData) -> str:
    """
    Genera el archivo XML con estándar UBL 2.1 (DIAN Colombia).
    Usa namespaces estándar cbc y cac.
    """
    NS_INVOICE = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
    NS_CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    NS_CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

    ET.register_namespace("", NS_INVOICE)
    ET.register_namespace("cac", NS_CAC)
    ET.register_namespace("cbc", NS_CBC)

    root = ET.Element(f"{{{NS_INVOICE}}}Invoice")

    def cbc(tag, text):
        el = ET.SubElement(root, f"{{{NS_CBC}}}{tag}")
        el.text = str(text)
        return el

    cbc("UBLVersionID", "UBL 2.1")
    cbc("CustomizationID", "10")
    cbc("ProfileID", "DIAN 2.1: Factura Electrónica de Venta")
    cbc("ID", f.numero_factura)
    cbc("IssueDate", f.fecha_emision.strftime("%Y-%m-%d"))
    cbc("IssueTime", f.fecha_emision.strftime("%H:%M:%S-05:00"))
    cbc("DueDate", f.fecha_vencimiento.strftime("%Y-%m-%d"))
    cbc("InvoiceTypeCode", "01")
    cbc("Note", f.resolucion_dian)
    cbc("DocumentCurrencyCode", f.moneda)

    # Emisor (AccountingSupplierParty)
    supplier = ET.SubElement(root, f"{{{NS_CAC}}}AccountingSupplierParty")
    supplier_party = ET.SubElement(supplier, f"{{{NS_CAC}}}Party")

    pname = ET.SubElement(supplier_party, f"{{{NS_CAC}}}PartyName")
    ET.SubElement(pname, f"{{{NS_CBC}}}Name").text = f.emisor_nombre

    ptax = ET.SubElement(supplier_party, f"{{{NS_CAC}}}PartyTaxScheme")
    ET.SubElement(ptax, f"{{{NS_CBC}}}RegistrationName").text = f.emisor_nombre
    ET.SubElement(ptax, f"{{{NS_CBC}}}CompanyID", schemeName="31").text = f.emisor_nit.replace(".", "").replace("-", "")
    tscheme = ET.SubElement(ptax, f"{{{NS_CAC}}}TaxScheme")
    ET.SubElement(tscheme, f"{{{NS_CBC}}}ID").text = "01"
    ET.SubElement(tscheme, f"{{{NS_CBC}}}Name").text = "IVA"

    paddr = ET.SubElement(supplier_party, f"{{{NS_CAC}}}PhysicalLocation")
    addr = ET.SubElement(paddr, f"{{{NS_CAC}}}Address")
    ET.SubElement(addr, f"{{{NS_CBC}}}CityName").text = f.emisor_ciudad
    aline = ET.SubElement(addr, f"{{{NS_CAC}}}AddressLine")
    ET.SubElement(aline, f"{{{NS_CBC}}}Line").text = f.emisor_direccion

    pcontact = ET.SubElement(supplier_party, f"{{{NS_CAC}}}Contact")
    ET.SubElement(pcontact, f"{{{NS_CBC}}}Telephone").text = f.emisor_telefono
    ET.SubElement(pcontact, f"{{{NS_CBC}}}ElectronicMail").text = f.emisor_email

    # Comprador (AccountingCustomerParty)
    customer = ET.SubElement(root, f"{{{NS_CAC}}}AccountingCustomerParty")
    cust_party = ET.SubElement(customer, f"{{{NS_CAC}}}Party")

    cname = ET.SubElement(cust_party, f"{{{NS_CAC}}}PartyName")
    ET.SubElement(cname, f"{{{NS_CBC}}}Name").text = f.comprador_nombre

    ctax = ET.SubElement(cust_party, f"{{{NS_CAC}}}PartyTaxScheme")
    ET.SubElement(ctax, f"{{{NS_CBC}}}RegistrationName").text = f.comprador_nombre
    ET.SubElement(ctax, f"{{{NS_CBC}}}CompanyID", schemeName="13").text = f.comprador_documento
    ctscheme = ET.SubElement(ctax, f"{{{NS_CAC}}}TaxScheme")
    ET.SubElement(ctscheme, f"{{{NS_CBC}}}ID").text = "01"
    ET.SubElement(ctscheme, f"{{{NS_CBC}}}Name").text = "IVA"

    caddr = ET.SubElement(cust_party, f"{{{NS_CAC}}}PhysicalLocation")
    caddr_in = ET.SubElement(caddr, f"{{{NS_CAC}}}Address")
    ET.SubElement(caddr_in, f"{{{NS_CBC}}}CityName").text = f.comprador_ciudad
    caline = ET.SubElement(caddr_in, f"{{{NS_CAC}}}AddressLine")
    ET.SubElement(caline, f"{{{NS_CBC}}}Line").text = f.comprador_direccion

    ccontact = ET.SubElement(cust_party, f"{{{NS_CAC}}}Contact")
    ET.SubElement(ccontact, f"{{{NS_CBC}}}Telephone").text = f.comprador_telefono
    ET.SubElement(ccontact, f"{{{NS_CBC}}}ElectronicMail").text = f.comprador_email

    # Medio de pago
    payment = ET.SubElement(root, f"{{{NS_CAC}}}PaymentMeans")
    ET.SubElement(payment, f"{{{NS_CBC}}}PaymentMeansCode").text = "10" if "EFECTIVO" in f.metodo_pago.upper() else "42"
    ET.SubElement(payment, f"{{{NS_CBC}}}PaymentDueDate").text = f.fecha_vencimiento.strftime("%Y-%m-%d")
    if f.referencia_pago:
        ET.SubElement(payment, f"{{{NS_CBC}}}PaymentID").text = f.referencia_pago

    # Impuestos Globales (TaxTotal)
    tax_total = ET.SubElement(root, f"{{{NS_CAC}}}TaxTotal")
    ET.SubElement(tax_total, f"{{{NS_CBC}}}TaxAmount", currencyID=f.moneda).text = f"{f.iva_monto:.2f}"

    tax_subtotal = ET.SubElement(tax_total, f"{{{NS_CAC}}}TaxSubtotal")
    ET.SubElement(tax_subtotal, f"{{{NS_CBC}}}TaxableAmount", currencyID=f.moneda).text = f"{f.subtotal:.2f}"
    ET.SubElement(tax_subtotal, f"{{{NS_CBC}}}TaxAmount", currencyID=f.moneda).text = f"{f.iva_monto:.2f}"
    tax_cat = ET.SubElement(tax_subtotal, f"{{{NS_CAC}}}TaxCategory")
    ET.SubElement(tax_cat, f"{{{NS_CBC}}}Percent").text = f"{f.iva_porcentaje * 100:.2f}"
    tax_sch = ET.SubElement(tax_cat, f"{{{NS_CAC}}}TaxScheme")
    ET.SubElement(tax_sch, f"{{{NS_CBC}}}ID").text = "01"
    ET.SubElement(tax_sch, f"{{{NS_CBC}}}Name").text = "IVA"

    # Totales Monetarios (LegalMonetaryTotal)
    legal_total = ET.SubElement(root, f"{{{NS_CAC}}}LegalMonetaryTotal")
    ET.SubElement(legal_total, f"{{{NS_CBC}}}LineExtensionAmount", currencyID=f.moneda).text = f"{f.subtotal:.2f}"
    ET.SubElement(legal_total, f"{{{NS_CBC}}}TaxExclusiveAmount", currencyID=f.moneda).text = f"{f.subtotal:.2f}"
    ET.SubElement(legal_total, f"{{{NS_CBC}}}TaxInclusiveAmount", currencyID=f.moneda).text = f"{f.total:.2f}"
    ET.SubElement(legal_total, f"{{{NS_CBC}}}PayableAmount", currencyID=f.moneda).text = f"{f.total:.2f}"

    # Líneas de Factura (InvoiceLine)
    for it in f.items:
        line = ET.SubElement(root, f"{{{NS_CAC}}}InvoiceLine")
        ET.SubElement(line, f"{{{NS_CBC}}}ID").text = str(it.item_id)
        ET.SubElement(line, f"{{{NS_CBC}}}InvoicedQuantity", unitCode="EA").text = str(it.cantidad)
        ET.SubElement(line, f"{{{NS_CBC}}}LineExtensionAmount", currencyID=f.moneda).text = f"{it.subtotal:.2f}"

        item_el = ET.SubElement(line, f"{{{NS_CAC}}}Item")
        ET.SubElement(item_el, f"{{{NS_CBC}}}Description").text = it.nombre

        price_el = ET.SubElement(line, f"{{{NS_CAC}}}Price")
        ET.SubElement(price_el, f"{{{NS_CBC}}}PriceAmount", currencyID=f.moneda).text = f"{it.precio_unitario:.2f}"

    xml_bytes = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return xml_bytes.decode("utf-8")
