import json
import os
from flask import Blueprint, jsonify

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
