import bcrypt

# La contraseña que queremos encriptar
password = "1234"

# Generamos el hash directo usando el estándar de bcrypt
salt = bcrypt.gensalt()
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

# Imprimimos el resultado como texto plano listo para pgAdmin
print(hashed.decode('utf-8'))