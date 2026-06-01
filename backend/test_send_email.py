import os, asyncio, sys
# Load .env
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path,'r',encoding='utf-8') as f:
        for line in f:
            line=line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                k,v=line.split('=',1)
                os.environ.setdefault(k.strip(), v.strip())
else:
    print('No .env found:', env_path); sys.exit(1)

try:
    from email_utils import send_activation_email
except Exception:
    # try package import
    from backend.email_utils import send_activation_email

async def main():
    to = os.environ.get('MAIL_USERNAME') or os.environ.get('MAIL_FROM')
    if not to:
        print('No recipient email configured. Set MAIL_USERNAME or MAIL_FROM in .env')
        return
    token = 'TEST-ACTIVATION-12345'
    print('Sending activation email to:', to)
    try:
        result = await send_activation_email(to, token)
        print('send_activation_email returned:', result)
    except Exception as e:
        print('Exception during send_activation_email:', e)

if __name__ == '__main__':
    asyncio.run(main())
