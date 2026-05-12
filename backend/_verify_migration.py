from sqlalchemy import create_engine, text
e = create_engine("postgresql://postgres:1234@localhost:5432/elan_db")
c = e.connect()
r = c.execute(text("SELECT id, username, email FROM users ORDER BY id")).fetchall()
print("USERS:")
for x in r:
    print(f"  ID={x[0]} username={x[1]} email={x[2]}")
cols = c.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='ventas' ORDER BY ordinal_position")).fetchall()
print("VENTAS COLUMNS:")
for x in cols:
    print(f"  {x[0]}")
c.close()
