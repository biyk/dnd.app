import json
import os
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

# Маршрут для получения начальной конфигурации
@config_bp.route('/config', methods=['GET'])
def get_init_config():
    init_config = load_config("init")
    if init_config is None:
        return jsonify({"error": "init.json not found"}), 404
    return jsonify(init_config)

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
    init_config = load_config("init")
    if init_config is None:
        return jsonify({"error": "init.json not found"}), 404

    data = request.get_json()
    ambience = data.get('ambience')
    map_name = init_config.get("map")
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
    init_config = load_config("init")
    if init_config is None:
        return jsonify({"error": "init.json not found"}), 404

    map_name = init_config.get("map")
    map_config = load_config(map_name)
    if map_config is None:
        return jsonify({"error": f"{map_name}.json not found"}), 404

    # Обновляем начальные параметры конфигурации
    map_config['init'] = {
        'round': data.get('round'),
        'try': data.get('try'),
        'all': data.get('all'),
    }
    map_config['lastUpdated'] = int(time.time())

    if not save_config(map_name, map_config):
        return jsonify({"error": f"Error saving updated configuration to '{map_name}.json'"}), 500

    return jsonify(map_config)

# Маршрут для получения начальной конфигурации init
@config_bp.route('/config/init', methods=['GET'])
def get_init_map_config():
    init_config = load_config("init")
    if init_config is None:
        return jsonify({"error": "init.json not found"}), 404

    map_name = init_config.get("map")
    map_config = load_config(map_name)
    if map_config is None:
        return jsonify({"error": f"{map_name}.json not found"}), 404

    return jsonify(map_config.get('init', {}))
