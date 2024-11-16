import sqlite3
import os

# Подключение к базе данных SQLite (будет создана, если её нет)
db_name = "../data/data.db"  # Имя файла базы данных
connection = sqlite3.connect(db_name)
cursor = connection.cursor()

# Названия основной и временной таблиц
main_table = "locations"
temp_table = "locations_temp"
images_dir_path = "../static/images"

# Проверка существования таблицы
check_table_query = f"""
SELECT name FROM sqlite_master WHERE type='table' AND name='{main_table}';
"""
cursor.execute(check_table_query)
table_exists = cursor.fetchone() is not None

# Удаляем временную таблицу, если она уже существует
check_temp_table_query = f"""
SELECT name FROM sqlite_master WHERE type='table' AND name='{temp_table}';
"""
cursor.execute(check_temp_table_query)
temp_table_exists = cursor.fetchone() is not None

if temp_table_exists:
    print(f"Временная таблица '{temp_table}' уже существует. Удаляем её...")
    drop_temp_table_query = f"DROP TABLE {temp_table};"
    cursor.execute(drop_temp_table_query)

if table_exists:
    print(f"Таблица '{main_table}' уже существует. Перемещаем данные во временную таблицу...")

    # Создание временной таблицы
    create_temp_table_query = f"""
    CREATE TABLE {temp_table} AS SELECT * FROM {main_table};
    """
    cursor.execute(create_temp_table_query)

    # Удаление основной таблицы
    drop_main_table_query = f"DROP TABLE {main_table};"
    cursor.execute(drop_main_table_query)

# Создание новой основной таблицы с полем parent_id и переименованным полем name
create_main_table_query = f"""
CREATE TABLE {main_table} (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    active BOOLEAN NOT NULL,
    images_dir TEXT,
    parent_id INTEGER DEFAULT 0
);
"""
cursor.execute(create_main_table_query)
print(f"Таблица '{main_table}' создана.")

if table_exists:
    print("Перенос данных из временной таблицы в новую таблицу...")

    # Перенос данных из временной таблицы в новую таблицу
    insert_data_query = f"""
    INSERT INTO {main_table} (ID, name, type, active, images_dir, parent_id)
    SELECT ID, location, type, active, images_dir, 0 FROM {temp_table};
    """
    cursor.execute(insert_data_query)

    # Удаление временной таблицы
    drop_temp_table_query = f"DROP TABLE {temp_table};"
    cursor.execute(drop_temp_table_query)
    print("Временная таблица удалена.")

# Проверяем наличие записей с type='main'
check_main_type_query = f"SELECT COUNT(*) FROM {main_table} WHERE type='main';"
cursor.execute(check_main_type_query)
main_type_count = cursor.fetchone()[0]

if main_type_count > 0:
    print(f"Найдено {main_type_count} записей с type='main'. Деактивируем их.")
    deactivate_main_query = f"UPDATE {main_table} SET active=0 WHERE type='main';"
    cursor.execute(deactivate_main_query)
else:
    print("Записей с type='main' не найдено.")

# Проверка папок в ../static/images
if not os.path.exists(images_dir_path):
    print(f"Директория {images_dir_path} не существует. Создайте её и повторите.")
else:
    print(f"Проверяем папки в директории {images_dir_path}...")
    directories = [d for d in os.listdir(images_dir_path) if os.path.isdir(os.path.join(images_dir_path, d))]

    for directory in directories:
        print(f"Обрабатываем папку: {directory}")

        # Проверяем, есть ли запись с images_dir = название папки
        check_directory_query = f"""
        SELECT COUNT(*) FROM {main_table} WHERE images_dir = ?;
        """
        cursor.execute(check_directory_query, (directory,))
        record_exists = cursor.fetchone()[0] > 0

        if not record_exists:
            print(f"Добавляем запись для папки: {directory}")
            insert_directory_query = f"""
            INSERT INTO {main_table} (name, type, active, images_dir, parent_id)
            VALUES (?, 'main', 1, ?, 0);
            """
            cursor.execute(insert_directory_query, (directory, directory))
        else:
            print(f"Запись для папки '{directory}' уже существует.")

# Сохранение изменений и закрытие соединения
connection.commit()
connection.close()

print(f"Обновление таблицы '{main_table}' завершено.")
