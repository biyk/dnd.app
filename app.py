import os
import json
import sys
import webbrowser  # Импортируем модуль для открытия браузера
from flask import Flask, render_template, request, jsonify, send_from_directory
from shapely.geometry import Polygon
from shapely.ops import unary_union

# Определяем базовый путь приложения
if getattr(sys, 'frozen', False):
    # Если приложение упаковано в .exe
    app_path = os.path.dirname(sys.executable)
else:
    # Если приложение запущено как скрипт
    app_path = os.path.dirname(os.path.abspath(__file__))

# Указание пути к папке с шаблонами для Flask
template_folder = os.path.join(app_path, 'templates')
app = Flask(__name__, template_folder=template_folder)

# Определение пути к папкам для конфигураций и изображений
CONFIG_PATH = os.path.join(app_path, 'configs')
IMAGES_PATH = os.path.join(app_path, 'images')

# Хранение данных о полигонах (пока в памяти)
polygons_data = []

@app.route('/')
def index():
    return render_template('index.html')  # Возвращаем HTML страницу (индекс)

# Маршрут для обслуживания изображений
@app.route('/images/<path:filename>')
def serve_image(filename):
    return send_from_directory(IMAGES_PATH, filename)

# Маршрут для получения начальной конфигурации
@app.route('/api/config', methods=['GET'])
def get_init_config():
    try:
        # Открываем файл начальной конфигурации
        with open(f"{CONFIG_PATH}/init.json", 'r') as f:
            init_config = json.load(f)
        return jsonify(init_config)
    except FileNotFoundError:
        return jsonify({"error": "init.json not found"}), 404

# Маршрут для получения конфигурации карты по названию
@app.route('/api/configs/<map_name>', methods=['GET'])
def get_map_config(map_name):
    try:
        # Открываем файл конфигурации карты
        with open(f"{CONFIG_PATH}/{map_name}.json", 'r') as f:
            map_config = json.load(f)
        return jsonify(map_config)
    except FileNotFoundError:
        return jsonify({"error": f"{map_name}.json not found"}), 404


@app.route('/api/polygons', methods=['POST'])
def save_polygons():
    # Получаем данные из запроса
    data = request.get_json()

    map_name = data.get('mapName')
    polygons_data = data.get('polygons', [])
    map_state = data.get('mapState', {})
    main_poligon = data.get('mainPolygon', {})

    if not map_name:
        return jsonify({"error": "mapName is required"}), 400

    config_file_path = os.path.join(CONFIG_PATH, f"{map_name}.json")

    if not os.path.isfile(config_file_path):
        return jsonify({"error": f"Configuration file for map '{map_name}' not found"}), 404

    try:
        with open(config_file_path, 'r') as f:
            map_config = json.load(f)
    except json.JSONDecodeError:
        return jsonify({"error": f"Error decoding JSON in file '{config_file_path}'"}), 500

    # Обработка и обрезка пересекающихся полигонов
    updated_polygons = []
    for i, poly_data in enumerate(polygons_data):
        polygon = Polygon(poly_data['points'])
        is_visible = poly_data.get('isVisible', True)

        for j, prev_poly_data in enumerate(updated_polygons):
            prev_polygon = Polygon(prev_poly_data['points'])

            if polygon.intersects(prev_polygon):
                # Обрезаем полигон, если он пересекается с предыдущим
                polygon = polygon.difference(prev_polygon)

        # Проверяем, является ли результатом многоугольник или мульти-многоугольник
        if polygon.is_empty:
            continue  # Пропускаем пустые геометрии после обрезки
        elif polygon.geom_type == 'MultiPolygon':
            # Если результат - MultiPolygon, обрабатываем каждый отдельный полигон через polygon.geoms
            for single_polygon in polygon.geoms:
                updated_polygons.append({
                    "points": list(single_polygon.exterior.coords),
                    "isVisible": is_visible
                })
        else:
            # Если результат - один Polygon, добавляем его как есть
            updated_polygons.append({
                "points": list(polygon.exterior.coords),
                "isVisible": is_visible
            })

    # Обновляем конфигурацию карты
    map_config['polygons'] = updated_polygons
    map_config['mapState'] = map_state
    map_config['mainPolygon'] = main_poligon

    print("Updated polygons data:", updated_polygons)
    print("Updated map state:", map_state)
    print("Updated map configuration:", map_config)

    try:
        with open(config_file_path, 'w') as f:
            json.dump(map_config, f, indent=4)
    except IOError:
        return jsonify({"error": f"Error saving updated configuration to '{config_file_path}'"}), 500

    return jsonify({"status": "success", "updatedConfig": map_config})

if __name__ == '__main__':
    # Запускаем сервер
    app.run(debug=True, use_reloader=False)  # use_reloader=False чтобы избежать двойного открытия браузера

    # После старта сервер автоматически откроет браузер на главной странице
    webbrowser.open("http://127.0.0.1:5000/")  # Открываем браузер по адресу приложения
