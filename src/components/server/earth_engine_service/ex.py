import psycopg2

# Conexión a la base de datos
conn = psycopg2.connect(dbname="sba", user="postgres", password="postgres")
cur = conn.cursor()

# Listar todas las especies, incluyendo las nuevas
especies = [
    "Dichrostachys Cinerea", "Colophospermum Mopane", "Senegalia Mellifera",
    "Terminalia Sericea", "Vachellia Karroo", "Vachellia Luederitzii", "Vachellia Nilotica"
]

# Verificar archivos en cada carpeta
for especie in especies:
    cur.execute("""
        SELECT f.name FROM files f
        JOIN folders fo ON f.folder_id = fo.id
        WHERE fo.name = %s
    """, (especie,))
    files = cur.fetchall()
    print(f"Archivos en la carpeta de {especie}: {[file[0] for file in files]}")

# Verificar archivos que deberían haber sido borrados
print("\nVerificando archivos eliminados que no cumplen el patrón...")
for especie in especies:
    cur.execute("""
        SELECT name FROM files WHERE name LIKE %s AND (NOT name LIKE %s OR NOT name LIKE %s)
    """, (f'%{especie}%', '%.asc', '%avg%'))
    files = cur.fetchall()
    if files:
        print(f"Archivos no borrados incorrectamente en {especie}: {[file[0] for file in files]}")
    else:
        print(f"No se encontraron archivos incorrectos en {especie}.")

# Cerrar conexión
cur.close()
conn.close()