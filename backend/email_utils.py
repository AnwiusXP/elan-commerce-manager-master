import os
from typing import Any, Dict

import resend
from starlette.concurrency import run_in_threadpool

# Single env variable: RESEND_API_KEY
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

if not RESEND_API_KEY:
    print("[EMAIL] RESEND_API_KEY no está definida; los correos se registrarán en logs.")


def _build_reset_html(reset_token: str) -> str:
    return f"""
    <html>
    <body style="margin:0; padding:0; background:#0d1117; font-family:Arial,sans-serif;">
    <div style="max-width:600px; margin:40px auto; padding:30px; border:1px solid #30363d; border-radius:12px; background:#161b22; color:#e6edf3;">
        <h2 style="color:#1e8a5e; text-align:center; margin-bottom:24px;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña en <strong>Élan Pure Commerce</strong>.</p>
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


async def _send_via_resend(to_email: str, subject: str, html_body: str) -> bool:
    print("=" * 60)
    print(f"  [EMAIL] Enviando via Resend")
    print(f"  Para:   {to_email}")
    print(f"  Asunto: {subject}")
    print("=" * 60)

    # Enforce mandatory from address
    from_email = "onboarding@resend.dev"

    if _resend_client is None:
        print("  ⚠️  Resend client no configurado (RESEND_API_KEY faltante). Se imprimirá el HTML en logs en lugar de enviar.")
        print(html_body)
        return True

    try:
        def _send() -> Dict[str, Any]:
            return _resend_client.emails.send(
                from_=from_email,
                to=to_email,
                subject=subject,
                html=html_body,
            )

        result = await run_in_threadpool(_send)
        print(f"  ✅  Email enviado a {to_email} via Resend. Response: {result}")
        return True
    except Exception as e:
        print(f"  ❌  Error enviando email via Resend: {e}")
        return True


async def send_reset_email(to_email: str, reset_token: str) -> bool:
    print("=" * 60)
    print(f"  [EMAIL] OTP GENERADO")
    print(f"  Para:   {to_email}")
    print(f"  Código: {reset_token}")
    print("=" * 60)

    html_body = _build_reset_html(reset_token)
    subject = "Código de Recuperación - Élan Pure"
    return await _send_via_resend(to_email, subject, html_body)


async def send_activation_email(to_email: str, token: str) -> bool:
    backend_url = BACKEND_URL
    print("=" * 60)
    print(f"  [EMAIL] EMAIL DE ACTIVACION GENERADO")
    print(f"  Para:   {to_email}")
    print(f"  Token:  {token}")
    print(f"  Backend URL usada: {backend_url}")
    print("=" * 60)

    html_body = _build_activation_html(backend_url, token)
    subject = "Activa tu cuenta - Élan Pure"
    return await _send_via_resend(to_email, subject, html_body)