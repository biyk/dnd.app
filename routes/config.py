import json
import os
import time

from flask import Blueprint, request, jsonify

# Создаем Blueprint для работы с конфигурациями
config_bp = Blueprint('config', __name__)

# Путь к конфигурационным файлам
def get_config_path():
    # Получаем путь к конфигурациям
    from app import app_path  # импортируем app_path локально, чтобы избежать циклического импорта
    return os.path.join(app_path, 'configs')

# Маршрут для получения начальной конфигурации
@config_bp.route('/config', methods=['GET'])
def get_init_config():
    try:
        # Открываем файл начальной конфигурации
        config_path = get_config_path()
        with open(f"{config_path}/init.json", 'r') as f:
            init_config = json.load(f)
        return jsonify(init_config)
    except FileNotFoundError:
        return jsonify({"error": "init.json not found"}), 404

# Маршрут для получения конфигурации карты по названию
@config_bp.route('/configs/<map_name>', methods=['GET'])
def get_map_config(map_name):
    try:
        # Открываем файл конфигурации карты
        config_path = get_config_path()
        with open(f"{config_path}/{map_name}.json", 'r') as f:
            map_config = json.load(f)
        return jsonify(map_config)
    except FileNotFoundError:
        return jsonify({"error": f"{map_name}.json not found"}), 404


@config_bp.route('/config/ambience', methods=['POST'])
def set_ambience_config():
    data = request.get_json()

    ambience = data.get('ambience')
    try:
        # Открываем файл конфигурации карты
        config_path = get_config_path()
        with open(f"{config_path}/init.json", 'r') as f:
            init_config = json.load(f)
        map_name = init_config['map'];
        with open(f"{config_path}/{map_name}.json", 'r') as f:
            map_config = json.load(f)
        map_config['ambience'] = ambience
        map_config['lastUpdated'] = int(time.time())  # Временная метка в формате ISO 8601

        try:
            with open(f"{config_path}/{map_name}.json", 'w') as f:
                json.dump(map_config, f, indent=4)
        except IOError:
            return jsonify({"error": f"Error saving updated configuration to '{config_path}/{map_name}'"}), 500

        return jsonify(map_config)
    except FileNotFoundError:
        return jsonify({"error": f"{map_name}.json not found"}), 404
