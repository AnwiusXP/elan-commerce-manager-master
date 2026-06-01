import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

# Read mail configuration from environment with strict keys and safe fallbacks
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM", MAIL_USERNAME or "noreply@elan.com")
MAIL_PORT = int(os.getenv("MAIL_PORT", "465"))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
# For production (Render) prefer SSL/TLS on port 465. STARTTLS should be False when using SSL.
MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "False").lower() in ("true", "1")
MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "True").lower() in ("true", "1")

# Determine if SMTP is usable
SMTP_CONFIGURED = bool(MAIL_SERVER and MAIL_PORT)

_conf = None
if SMTP_CONFIGURED:
    _conf = ConnectionConfig(
        MAIL_USERNAME=MAIL_USERNAME,
        MAIL_PASSWORD=MAIL_PASSWORD,
        MAIL_FROM=MAIL_FROM,
        MAIL_PORT=MAIL_PORT,
        MAIL_SERVER=MAIL_SERVER,
        MAIL_FROM_NAME="Élan Pure Commerce",
        MAIL_STARTTLS=MAIL_STARTTLS,
        MAIL_SSL_TLS=MAIL_SSL_TLS,
        USE_CREDENTIALS=bool(MAIL_USERNAME and MAIL_PASSWORD),
        VALIDATE_CERTS=False,
    )


def _build_reset_html(reset_token: str) -> str:
    return f"""
    <html>
    <body style="margin:0; padding:0; background:#0d1117; font-family:Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; padding:30px; border:1px solid #30363d; border-radius:12px; background:#161b22; color:#e6edf3;">
        <h2 style="color:#1e8a5e; text-align:center; margin-bottom:24px;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña en <strong>Élan Pure Commerce Manager</strong>.</p>
        <p>Tu código de verificación de un solo uso (OTP) es:</p>
        <div style="text-align:center; margin:30px 0;">
            <span style="font-size:36px; font-weight:bold; letter-spacing:8px; color:#fff; background:#1e8a5e; padding:12px 24px; border-radius:8px; display:inline-block;">
                {reset_token}
            </span>
        </div>
        <p>Este código expirará en <strong>10 minutos</strong>.</p>
        <p style="color:#8b949e;">Si no solicitaste este cambio, ignora este mensaje. Tu contraseña actual <strong>no será modificada</strong> hasta que completes todo el proceso.</p>
        <hr style="border:0; border-top:1px solid #30363d; margin:24px 0;">
        <p style="font-size:12px; color:#8b949e; text-align:center;">&copy; 2026 Élan Pure Commerce Manager</p>
    </div>
    </body>
    </html>
    """


def _build_activation_html(backend_url: str, token: str) -> str:
    activation_url = f"{backend_url.rstrip('/')}/api/users/activate/{token}"
    return f"""
    <html>
    <body style="margin:0; padding:0; background:#f8f9fa; font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:600px; margin:40px auto; padding:28px; border-radius:10px; background:#ffffff; color:#212529; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
        <h2 style="color:#00a29a; text-align:left; margin-bottom:12px;">Activa tu cuenta</h2>
        <p style="margin:8px 0 18px;">Hola,</p>
        <p style="margin:0 0 18px;">Se solicitó la creación de una cuenta en <strong>Élan Pure</strong>. Para completar el registro y activar tu cuenta, pulsa el botón de abajo:</p>
        <div style="text-align:left; margin:24px 0;">
            <a href="{activation_url}" style="display:inline-block; background:#00a29a; color:#ffffff; text-decoration:none; font-weight:600; padding:12px 20px; border-radius:8px; font-size:15px;">Activar mi cuenta</a>
        </div>
        <p style="margin:0 0 8px; font-size:13px; color:#495057;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="word-break:break-all; font-size:13px; color:#00a29a;">{activation_url}</p>
        <p style="margin-top:18px; font-size:13px; color:#6c757d;">Este enlace expirará en 7 días. Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
        <hr style="border:0; border-top:1px solid #e9ecef; margin:20px 0;">
        <p style="font-size:12px; color:#6c757d; text-align:center;">&copy; 2026 Élan Pure Commerce Manager</p>
    </div>
    </body>
    </html>
    """


async def send_reset_email(to_email: str, reset_token: str) -> bool:
    print("=" * 60)
    print(f"  [EMAIL] OTP GENERADO")
    print(f"  Para:   {to_email}")
    print(f"  Código: {reset_token}")
    print("=" * 60)

    if not SMTP_CONFIGURED or _conf is None:
        print("  ⚠️  SMTP no configurado. Usa el código de arriba.")
        return True

    try:
        html_body = _build_reset_html(reset_token)
        message = MessageSchema(
            subject="Código de Recuperación - Élan Pure",
            recipients=[to_email],
            body=html_body,
            subtype=MessageType.html,
        )
        fm = FastMail(_conf)
        await fm.send_message(message)
        print(f"  ✅  Correo enviado a {to_email}")
        return True
    except Exception as e:
        print(f"  ❌  Error al enviar correo: {e}")
        return True


async def send_activation_email(to_email: str, token: str) -> bool:
    backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
    print("=" * 60)
    print(f"  [EMAIL] EMAIL DE ACTIVACION GENERADO")
    print(f"  Para:   {to_email}")
    print(f"  Token:  {token}")
    print(f"  Backend URL usada: {backend_url}")
    print("=" * 60)

    if not SMTP_CONFIGURED or _conf is None:
        print("  ⚠️  SMTP no configurado. Imprimiendo enlace de activación en logs:")
        print(f"  {backend_url.rstrip('/')}/api/users/activate/{token}")
        return True

    try:
        html_body = _build_activation_html(backend_url, token)
        message = MessageSchema(
            subject="Activa tu cuenta - Élan Pure",
            recipients=[to_email],
            body=html_body,
            subtype=MessageType.html,
        )
        fm = FastMail(_conf)
        await fm.send_message(message)
        print(f"  ✅  Email de activación enviado a {to_email}")
        return True
    except Exception as e:
        print(f"  ❌  Error al enviar correo: {e}")
        return True