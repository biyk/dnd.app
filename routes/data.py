from flask import Blueprint, render_template, Flask, request, jsonify
import os
from flask import request, render_template, send_file
from bs4 import BeautifulSoup  # Убедитесь, что библиотека установлена
import sqlite3

app = Flask(__name__)

DATABASE = "data/data.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

data_bp = Blueprint('data', __name__)

@data_bp.route('/data/monsters/json', methods=['GET'])
def get_monsters():
    name_query = request.args.get('name', '').strip()
    if not name_query:
        return jsonify([])

    variants = [name_query.lower(), name_query.capitalize(), name_query.upper()]
    query = f"""
        SELECT * FROM monsters
        WHERE {" OR ".join(["name LIKE ?"] * len(variants))} LIMIT 10
    """
    with get_db_connection() as conn:
        results = conn.execute(query, tuple(f"%{v}%" for v in variants)).fetchall()

    return jsonify([dict(row) for row in results])

@data_bp.route('/data/monsters/html', methods=['GET'])
def get_monsters_html():
    html_dir = './utils/dndsu'
    name_query = request.args.get('name', '').strip()
    if not name_query:
        return "Имя монстра не указано", 400  # Возвращаем ошибку если имя не задано

    query = """
        SELECT * FROM monsters
        WHERE name LIKE ? LIMIT 10
    """
    with get_db_connection() as conn:
        results = conn.execute(query, (f"%{name_query}%",)).fetchall()

    if not results:
        return "Монстры не найдены", 404

    monsters = [dict(row) for row in results]

    # Работаем с первым результатом (или можно сделать цикл для всех)
    for monster in monsters:
        url = monster.get('url')
        if not url or monster.get('name')!=name_query:
            continue  # Пропускаем, если URL отсутствует

        # Преобразуем URL в имя файла
        try:
            filename = url.split('/')[-2]  # Извлекаем последнюю часть URL
            html_filename = f"bestiary_{filename}.html"
            html_filepath = os.path.join(html_dir, html_filename)

            # Проверяем, существует ли файл
            if os.path.exists(html_filepath):
                # Открываем файл и ищем нужный блок
                with open(html_filepath, 'r', encoding='utf-8') as html_file:
                    soup = BeautifulSoup(html_file, 'html.parser')
                    block = soup.select_one('.card__category-bestiary:not(.card__group-multiverse)')
                    if block:
                        return block.decode_contents(), 200
        except Exception as e:
            return f"Ошибка обработки файла: {e}", 500

    return "HTML-файл не найден или блок отсутствует " + html_filepath, 404



@data_bp.route('/data/location', methods=['GET'])
def get_locations():
    parent_id = request.args.get('parent_id', type=int)
    type_filter = request.args.get('type', '')
    active = request.args.get('active', type=bool, default=True)

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

    with get_db_connection() as conn:
        results = conn.execute(query, tuple(params)).fetchall()

    return jsonify([dict(row) for row in results])

@data_bp.route('/data/location', methods=['POST'])
def add_location():
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({"error": "Название локации обязательно"}), 400

    with get_db_connection() as conn:
        main_location = conn.execute("""
            SELECT id FROM locations 
            WHERE type = 'main' AND active = 1
        """).fetchone()

        if not main_location:
            return jsonify({"error": "Нет активной основной локации"}), 400

        parent_id = main_location['id']
        conn.execute("""
            INSERT INTO locations (name, type, parent_id, active)
            VALUES (?, 'second', ?, 1)
        """, (name, parent_id))
        conn.commit()

    return jsonify({"message": "Локация успешно добавлена"}), 201

@data_bp.route('/data/location/remove', methods=['POST'])
def remove_location():
    data = request.get_json()
    location = data.get('location')
    if not location:
        return jsonify({"error": "id локации обязательно"}), 400

    with get_db_connection() as conn:
        result = conn.execute("""
            SELECT id FROM locations WHERE id = ?
        """, (location,)).fetchone()

        if not result:
            return jsonify({"error": "Локация не найдена"}), 404

        conn.execute("DELETE FROM locations WHERE id = ?", (location,))
        conn.execute("DELETE FROM location_npc WHERE location_id = ?", (location,))
        conn.commit()

    return jsonify({"message": "Локация успешно удалена"}), 200
@data_bp.route('/data/location/update', methods=['POST'])
def update_location():
    data = request.get_json()
    location = data.get('location')
    name = data.get('name')

    if not location:
        return jsonify({"error": "id локации обязательно"}), 400
    if not name:
        return jsonify({"error": "Имя локации обязательно"}), 400

    with get_db_connection() as conn:
        result = conn.execute("""
            SELECT id FROM locations WHERE id = ?
        """, (location,)).fetchone()

        if not result:
            return jsonify({"error": "Локация не найдена"}), 404

        conn.execute("UPDATE locations SET name = ? WHERE id = ?", (name, location,))
        conn.commit()

    return jsonify({"message": "Локация успешно обновлена"}), 200

@data_bp.route('/data/locations/npc/', methods=['GET'])
def get_location_npc():
    location_id = request.args.get('location_id', type=int)
    if not location_id:
        return jsonify({"error": "location_id обязателен"}), 400

    with get_db_connection() as conn:
        npc_ids = [row['npc_id'] for row in conn.execute("""
            SELECT npc_id FROM location_npc WHERE location_id = ?
        """, (location_id,))]

        if not npc_ids:
            return jsonify([])

        query = f"SELECT * FROM monsters WHERE id IN ({','.join(['?'] * len(npc_ids))})"
        monsters = conn.execute(query, tuple(npc_ids)).fetchall()

    return jsonify([dict(row) for row in monsters])

@data_bp.route('/data/locations/npc/add', methods=['POST'])
def add_location_npc():
    data = request.get_json()
    location_id = data.get('location_id')
    npc_id = data.get('monster_id')

    if not location_id or not npc_id:
        return jsonify({"error": "location_id и npc_id обязательны"}), 400

    with get_db_connection() as conn:
        if conn.execute("""
            SELECT 1 FROM location_npc WHERE location_id = ? AND npc_id = ?
        """, (location_id, npc_id)).fetchone():
            return jsonify({"message": "Такая связь уже существует"}), 200

        conn.execute("""
            INSERT INTO location_npc (location_id, npc_id)
            VALUES (?, ?)
        """, (location_id, npc_id))
        conn.commit()

    return jsonify({"message": "Связь успешно добавлена"}), 201

@data_bp.route('/data/locations/npc/remove', methods=['POST'])
def remove_location_npc():
    data = request.get_json()
    location_id = data.get('location_id')
    npc_id = data.get('monster_id')

    if not location_id or not npc_id:
        return jsonify({"error": "location_id и npc_id обязательны"}), 400

    with get_db_connection() as conn:
        if not conn.execute("""
            SELECT 1 FROM location_npc WHERE location_id = ? AND npc_id = ?
        """, (location_id, npc_id)).fetchone():
            return jsonify({"error": "Данного монстра в этой локации нет"}), 200

        conn.execute("DELETE FROM location_npc WHERE npc_id = ?", (npc_id,))
        conn.commit()

    return jsonify({"message": "Связь успешно удалена"}), 200


@data_bp.route('/data/npc/add', methods=['POST'])
def add_custom_npc():
    data = request.form
    cd = data.get('cd')
    name = data.get('name')
    health = data.get('health')
    template = data.get('template')
    text = data.get('text')

    if not template:
        return jsonify({"error": "template обязательны"}), 400

    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO npc (name, cd, hp, text, template)
            VALUES (?, ?, ?, ?, ?)
        """, (name, cd, health, text, template, ))
        conn.commit()

    return jsonify({"message": "Персонаж успешно добавлен"}), 200


@data_bp.route('/data/npc', methods=['GET'])
def get_custom_npc():
    name = request.args.get('name', type=str)  # Если это строка, используем type=str

    with get_db_connection() as conn:
        if name:
            # Используем параметризованный запрос для защиты от SQL-инъекций
            query = "SELECT * FROM npc WHERE name = ?"
            results = conn.execute(query, (name,)).fetchall()
        else:
            query = "SELECT * FROM npc"
            results = conn.execute(query).fetchall()

    return jsonify([dict(row) for row in results])

@data_bp.route('/data/npc/delete/<int:id>', methods=['DELETE'])
def delete_custom_npc(id):
    with get_db_connection() as conn:
        # Проверяем, существует ли персонаж с таким ID
        npc = conn.execute("SELECT * FROM npc WHERE id = ?", (id,)).fetchone()
        if not npc:
            return jsonify({"error": "Персонаж не найден"}), 404

        # Удаляем персонажа
        conn.execute("DELETE FROM npc WHERE id = ?", (id,))
        conn.commit()

    return jsonify({"message": f"Персонаж с ID {id} успешно удалён"}), 200

@data_bp.route('/data/npc/update/', methods=['POST'])
def update_custom_npc():
    data = request.form
    cd = data.get('cd')
    id = data.get('id')
    name = data.get('name')
    health = data.get('health')
    text = data.get('text')

    with get_db_connection() as conn:
        # Проверяем, существует ли запись с данным ID
        cursor = conn.execute("SELECT id FROM npc WHERE id = ?", (id,))
        if cursor.fetchone() is None:
            return jsonify({"error": f"Персонаж с ID {id} не найден"}), 404

        # Обновляем запись
        conn.execute("""
            UPDATE npc SET name = ?, cd = ?, hp = ?, text = ? WHERE id = ?
        """, (name, cd, health, text, id))
        conn.commit()

    return jsonify({"message": f"Персонаж с ID {id} успешно изменен"}), 200
