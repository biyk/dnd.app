import json
import os
import sqlite3
import time
from flask import Blueprint, request, jsonify

# Создаем Blueprint для работы с конфигурациями
config_bp = Blueprint('config', __name__)

# Получаем путь к конфигурациям
def get_config_path():
    from app import app_path  # импортируем app_path локально, чтобы избежать циклического импорта
    return os.path.join(app_path, 'configs')

# Вспомогательная функция для загрузки JSON файла конфигурации
def load_config(file_name):
    config_path = get_config_path()
    try:
        with open(os.path.join(config_path, f"{file_name}.json"), 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

# Вспомогательная функция для сохранения JSON файла конфигурации
def save_config(file_name, config_data):
    config_path = get_config_path()
    try:
        with open(os.path.join(config_path, f"{file_name}.json"), 'w') as f:
            json.dump(config_data, f, indent=4)
        return True
    except IOError:
        return False

def get_db_path():
    from app import app_path  # импортируем app_path локально, чтобы избежать циклического импорта
    return os.path.join(app_path, 'data', 'data.db')

def query_main_active_location():
    db_path = get_db_path()
    try:
        connection = sqlite3.connect(db_path)
        cursor = connection.cursor()

        # SQL-запрос для поиска записи с type='main' и active=1
        query = """
        SELECT images_dir FROM locations
        WHERE type = 'main' AND active = true
        LIMIT 1;
        """
        cursor.execute(query)
        result = cursor.fetchone()
        connection.close()

        # Если запись найдена, возвращаем images_dir
        return result[0] if result else None
    except sqlite3.Error as e:
        print(f"Ошибка при работе с базой данных: {e}")
        return None

# Маршрут для получения начальной конфигурации


@config_bp.route('/config', methods=['GET'])
def get_init_config():
    images_dir = query_main_active_location()
    if images_dir is None:
        return jsonify({"error": "No active main location found"}), 404
    return jsonify({"map": images_dir})

# Маршрут для получения конфигурации карты по названию
@config_bp.route('/configs/<map_name>', methods=['GET'])
def get_map_config(map_name):
    map_config = load_config(map_name)
    if map_config is None:
        return jsonify({"error": f"{map_name}.json not found"}), 404
    return jsonify(map_config)

# Маршрут для установки конфигурации окружения
@config_bp.route('/config/ambience', methods=['POST'])
def set_ambience_config():
    data = request.get_json()
    ambience = data.get('ambience')
    map_name = query_main_active_location()
    map_config = load_config(map_name)
    if map_config is None:
        return jsonify({"error": f"{map_name}.json not found"}), 404

    # Обновляем временную метку
    map_config['ambience'] = ambience
    map_config['lastUpdated'] = int(time.time())

    if not save_config(map_name, map_config):
        return jsonify({"error": f"Error saving updated configuration to '{map_name}.json'"}), 500

    return jsonify(map_config)

# Маршрут для установки начальной конфигурации
@config_bp.route('/config/init', methods=['POST'])
def update_init_config():
    data = request.get_json()

    map_name = query_main_active_location()
    map_config = load_config(map_name)
    if map_config is None:
        return jsonify({"error": f"{map_name}.json not found"}), 404

    # Обновляем начальные параметры конфигурации
    map_config['init'] = {
        'round': data.get('round'),
        'try': data.get('try'),
        'all': data.get('all'),
        'rating': data.get('rating'),
        'next': data.get('next'),
    }
    map_config['lastUpdated'] = int(time.time())
    map_config['timer'] = int(time.time() + 60)

    if not save_config(map_name, map_config):
        return jsonify({"error": f"Error saving updated configuration to '{map_name}.json'"}), 500

    return jsonify(map_config)

# Маршрут для получения начальной конфигурации init
@config_bp.route('/config/init', methods=['GET'])
def get_init_map_config():
    map_name = query_main_active_location()
    map_config = load_config(map_name)
    if map_config is None:
        return jsonify({"error": f"{map_name}.json not found"}), 404

    return jsonify(map_config.get('init', {}))


@config_bp.route('/config/dm', methods=['POST'])
def post_dm_config():
    try:
        # Получаем данные из запроса
        data = request.get_json()
        text = data.get('text', '')

        # Разбиваем текст на строки
        lines = text.splitlines()

        # Сохраняем данные в файл
        if not save_config('text', lines):
            return jsonify({"error": "Error saving updated configuration to 'text.json'"}), 500

        return jsonify('lines')

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@config_bp.route('/config/dm', methods=['GET'])
def get_dm_config():
    # Загружаем данные из файла (если файл существует)
    try:
        # Печатаем путь к файлу для отладки
        config_path = get_config_path()
        print(f"Attempting to load file from: {os.path.join(config_path, 'text.json')}")

        text = load_config("text")
        if text is None:
            return jsonify({"error": "text.json not found"}), 404

        return jsonify(text)  # Возвращаем массив строк

    except Exception as e:
        # Печатаем ошибку, если что-то пошло не так
        print(f"Error loading config: {e}")
        return jsonify({"error": "Error loading configuration"}), 500
