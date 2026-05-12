import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType

MAIL_SERVER   = os.getenv("MAIL_SERVER", "localhost")
MAIL_PORT     = int(os.getenv("MAIL_PORT", "1025"))
MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "false").lower() in ("true", "1")
MAIL_SSL_TLS  = os.getenv("MAIL_SSL_TLS", "false").lower() in ("true", "1")
SMTP_USER     = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL    = os.getenv("FROM_EMAIL", "noreply@elan.com")

SMTP_CONFIGURED = bool(MAIL_SERVER)

_conf = None
if SMTP_CONFIGURED:
    _conf = ConnectionConfig(
        MAIL_USERNAME=SMTP_USER,
        MAIL_PASSWORD=SMTP_PASSWORD,
        MAIL_FROM=FROM_EMAIL,
        MAIL_PORT=MAIL_PORT,
        MAIL_SERVER=MAIL_SERVER,
        MAIL_FROM_NAME="Élan Pure Commerce",
        MAIL_STARTTLS=MAIL_STARTTLS,
        MAIL_SSL_TLS=MAIL_SSL_TLS,
        USE_CREDENTIALS=bool(SMTP_USER and SMTP_PASSWORD),
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


def _build_activation_html(activation_url: str) -> str:
    return f"""
    <html>
    <body style="margin:0; padding:0; background:#0d1117; font-family:Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; padding:30px; border:1px solid #30363d; border-radius:12px; background:#161b22; color:#e6edf3;">
        <h2 style="color:#1e8a5e; text-align:center; margin-bottom:24px;">Activa tu Cuenta</h2>
        <p>¡Bienvenido a <strong>Élan Pure Commerce Manager</strong>!</p>
        <p>Tu cuenta ha sido creada. Para activar tu acceso, haz clic en el botón de abajo:</p>
        <div style="text-align:center; margin:30px 0;">
            <a href="{activation_url}" style="display:inline-block; background:#1e8a5e; color:#fff; text-decoration:none; font-weight:bold; padding:14px 32px; border-radius:8px; font-size:1rem;">
                Activar mi cuenta
            </a>
        </div>
        <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
        <p style="color:#1e8a5e; word-break:break-all; font-size:0.85rem;">{activation_url}</p>
        <p>Este enlace expirará en <strong>7 días</strong>.</p>
        <p style="color:#8b949e; font-size:0.85rem;">Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
        <hr style="border:0; border-top:1px solid #30363d; margin:24px 0;">
        <p style="font-size:12px; color:#8b949e; text-align:center;">&copy; 2026 Élan Pure Commerce Manager</p>
    </div>
    </body>
    </html>
    """


async def send_reset_email(to_email: str, reset_token: str) -> bool:
    print("=" * 60)
    print(f"  📧  OTP GENERADO")
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


async def send_activation_email(to_email: str, activation_url: str) -> bool:
    print("=" * 60)
    print(f"  📧  EMAIL DE ACTIVACIÓN GENERADO")
    print(f"  Para:   {to_email}")
    print(f"  Enlace: {activation_url}")
    print("=" * 60)

    if not SMTP_CONFIGURED or _conf is None:
        print("  ⚠️  SMTP no configurado. Revisa http://localhost:8025")
        return True

    try:
        html_body = _build_activation_html(activation_url)
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