import bcrypt

contrasena_plana = "1234"
# Generamos el hash con su respectiva 'sal'
hash_generado = bcrypt.hashpw(contrasena_plana.encode("utf-8"), bcrypt.gensalt())

print("Pega este texto en tu base de datos:")
print(hash_generado.decode("utf-8"))
