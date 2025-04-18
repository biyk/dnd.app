import os
import json
import time
import hashlib
from flask import Blueprint, request, jsonify, current_app
from shapely.geometry import Polygon

# Создаем Blueprint для работы с полигонами
polygons_bp = Blueprint('polygons', __name__)

@polygons_bp.route('/polygons', methods=['POST'])
def save_polygons():
    # Получаем данные из запроса
    data = request.get_json()

    map_name = data.get('mapName')

    if not map_name:
        return jsonify({"error": "mapName is required"}), 400

    # Получаем CONFIG_PATH из конфигу рации приложения
    config_path = current_app.config['CONFIG_PATH']
    config_file_path = os.path.join(config_path, f"{map_name}.json")

    if not os.path.isfile(config_file_path):
        return jsonify({"error": f"Configuration file for map '{map_name}' not found"}), 404

    try:
        with open(config_file_path, 'r') as f:
            map_config = json.load(f)
    except json.JSONDecodeError:
        return jsonify({"error": f"Error decoding JSON in file '{config_file_path}'"}), 500

    polygons_data = data.get('polygons', map_config['polygons'])
    markers_data = data.get('markers', map_config['markers'])
    map_state = data.get('mapState', map_config['mapState'])
    measure = data.get('measure', map_config['measure'])
    settings = data.get('settings', map_config['settings'])
    main_polygon = data.get('mainPolygon', map_config['mainPolygon'])



    # Обработка и обрезка пересекающихся полигонов
    updated_polygons = []
    for poly_data in polygons_data:
        # Генерация MD5-хэша, если code отсутствует или пуст
        if not poly_data.get('code'):
            points_str = json.dumps(poly_data['points'], sort_keys=True)
            poly_data['code'] = hashlib.md5(points_str.encode('utf-8')).hexdigest()

        polygon = Polygon(poly_data['points'])
        is_visible = poly_data.get('isVisible', True)

        for prev_poly_data in updated_polygons:
            prev_polygon = Polygon(prev_poly_data['points'])
            if polygon.intersects(prev_polygon):
                polygon = polygon.difference(prev_polygon)

        if polygon.is_empty:
            continue
        elif polygon.geom_type == 'MultiPolygon':
            for single_polygon in polygon.geoms:
                updated_polygons.append({
                    "points": list(single_polygon.exterior.coords),
                    "isVisible": is_visible,
                    "code": poly_data['code']
                })
        else:
            updated_polygons.append({
                "points": list(polygon.exterior.coords),
                "isVisible": is_visible,
                "code": poly_data['code']
            })

    map_config['polygons'] = updated_polygons
    map_config['mapState'] = map_state
    map_config['markers'] = markers_data
    map_config['mainPolygon'] = main_polygon
    map_config['settings'] = settings
    map_config['measure'] = measure
    map_config['lastUpdated'] = int(time.time())  # Временная метка в формате ISO 8601

    try:
        with open(config_file_path, 'w') as f:
            json.dump(map_config, f, indent=4)
    except IOError:
        return jsonify({"error": f"Error saving updated configuration to '{config_file_path}'"}), 500

    return jsonify({"status": "success", "updatedConfig": map_config})
