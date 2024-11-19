import sqlite3
import os

# Подключение к базе данных SQLite (будет создана, если её нет)
db_name = "../data/data.db"  # Имя файла базы данных

conn = sqlite3.connect(db_name)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Создаем таблицу location_npc, если она не существует
cursor.execute("""
    CREATE TABLE IF NOT EXISTS location_npc (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        npc_id INTEGER NOT NULL,
        FOREIGN KEY (location_id) REFERENCES locations (id),
        FOREIGN KEY (npc_id) REFERENCES monsters (id),
        UNIQUE(location_id, npc_id)  -- Гарантируем уникальность пар
    )
""")
conn.commit()
conn.close()

print("Миграция завершена: таблица location_npc создана (если отсутствовала).")