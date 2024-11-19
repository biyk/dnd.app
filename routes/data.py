from flask import Blueprint, render_template
from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

DATABASE = "data/data.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Создаем Blueprint для главной страницы
data_bp = Blueprint('data', __name__)

@data_bp.route('/data/monsters', methods=['GET'])
def get_monsters():
    name_query = request.args.get('name', '').strip()  # Получаем запрос пользователя
    if not name_query:
        return jsonify([])

    # Генерируем возможные варианты регистра
    variants = [name_query.lower(), name_query.capitalize(), name_query.upper()]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Создаём SQL-запрос с несколькими LIKE
    conditions = " OR ".join(["name LIKE ?"] * len(variants))
    query = f"""
        SELECT * FROM monsters
        WHERE {conditions} LIMIT 10
    """
    cursor.execute(query, tuple(f"%{v}%" for v in variants))
    results = cursor.fetchall()
    conn.close()

    # Формируем JSON со всеми полями
    return jsonify([dict(row) for row in results])


# Обработчик GET запроса для /api/data/location
@data_bp.route('/data/location', methods=['GET'])
def get_locations():
    parent_id = request.args.get('parent_id', type=int)  # Получаем родительский ID
    type_filter = request.args.get('type', '')  # Получаем тип локации (main или second)
    active = request.args.get('active', type=bool, default=True)  # Фильтр по активности, по умолчанию True

    conn = get_db_connection()
    cursor = conn.cursor()

    # Строим базовый запрос
    query = "SELECT * FROM locations WHERE 1=1"

    params = []

    if type_filter:
        query += " AND type = ?"
        params.append(type_filter)

    if parent_id:
        query += " AND parent_id = ?"
        params.append(parent_id)

    if active is not None:
        query += " AND active = ?"
        params.append(active)

    # Выполняем запрос
    cursor.execute(query, tuple(params))
    results = cursor.fetchall()
    conn.close()

    # Формируем и возвращаем результат
    return jsonify([dict(row) for row in results])


# Обработчик POST запроса для /api/data/location
@data_bp.route('/data/location', methods=['POST'])
def add_location():
    data = request.get_json()
    name = data.get('name').strip()  # Получаем название локации
    if not name:
        return jsonify({"error": "Название локации обязательно"}), 400

    # Находим основную локацию с активным статусом
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id FROM locations 
        WHERE type = 'main' AND active = 1
    """)
    main_location = cursor.fetchone()

    if not main_location:
        conn.close()
        return jsonify({"error": "Нет активной основной локации"}), 400

    parent_id = main_location['id']

    # Вставляем новую запись с типом 'second'
    cursor.execute("""
        INSERT INTO locations (name, type, parent_id, active)
        VALUES (?, 'second', ?, 1)
    """, (name, parent_id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Локация успешно добавлена"}), 201


@data_bp.route('/data/location/remove', methods=['POST'])
def remove_location():
    data = request.get_json()
    if not data or not data.get('location'):  # Проверяем наличие данных и ключа
        return jsonify({"error": "id локации обязательно"}), 400

    location = data.get('location')  # Получаем название локации
    if not location:
        return jsonify({"error": "id локации обязательно"}), 400

    # Находим локацию с активным статусом
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id FROM locations 
            WHERE id = ?
        """, (location,))
        result = cursor.fetchone()

        if not result:
            return jsonify({"error": "Локация не найдена"}), 404

        # Удаляем локацию
        cursor.execute("""
            DELETE FROM locations 
            WHERE id = ?
        """, (location,))
        conn.commit()

        # Удаляем всех монстров
        cursor.execute("""
            DELETE FROM location_npc 
            WHERE location_id = ?
        """, (location,))
        conn.commit()

        return jsonify({"message": "Локация успешно удалена"}), 200

    finally:
        cursor.close()
        conn.close()


# Обработчик GET запроса для /api/data/locations/npc
@data_bp.route('/data/locations/npc', methods=['GET'])
def get_location_npc():
    location_id = request.args.get('location_id', type=int)  # Получаем ID локации
    if not location_id:
        return jsonify({"error": "location_id обязателен"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Получаем NPC IDs, связанные с данной локацией
    cursor.execute("""
        SELECT npc_id FROM location_npc WHERE location_id = ?
    """, (location_id,))
    npc_ids = [row['npc_id'] for row in cursor.fetchall()]

    if not npc_ids:
        conn.close()
        return jsonify([])  # Возвращаем пустой список, если NPC не связаны

    # Получаем информацию о NPC из таблицы monsters
    query = f"""
        SELECT * FROM monsters WHERE id IN ({','.join(['?'] * len(npc_ids))})
    """
    cursor.execute(query, tuple(npc_ids))
    monsters = cursor.fetchall()
    conn.close()

    # Формируем и возвращаем результат
    return jsonify([dict(row) for row in monsters])


# Обработчик POST запроса для /api/data/locations/npc
@data_bp.route('/data/locations/npc', methods=['POST'])
def add_location_npc():
    data = request.get_json()
    location_id = data.get('location_id')  # ID локации
    npc_id = data.get('monster_id')  # ID NPC

    print(location_id, npc_id)
    if not location_id or not npc_id:
        return jsonify({"error": "location_id и npc_id обязательны"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Проверяем, существует ли такая запись
    cursor.execute("""
        SELECT 1 FROM location_npc WHERE location_id = ? AND npc_id = ?
    """, (location_id, npc_id))
    if cursor.fetchone():
        conn.close()
        return jsonify({"message": "Такая связь уже существует"}), 200

    # Добавляем новую связь
    cursor.execute("""
        INSERT INTO location_npc (location_id, npc_id)
        VALUES (?, ?)
    """, (location_id, npc_id))
    conn.commit()
    conn.close()

    return jsonify({"message": "Связь успешно добавлена"}), 201