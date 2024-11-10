import os
import json
import sys
from flask import Flask, render_template, request, jsonify, send_from_directory

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

print(template_folder);
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

    map_name = data.get('mapName')  # Извлекаем mapName из данных запроса
    polygons = data.get('polygons', [])
    map_state = data.get('mapState', {})

    # Проверяем, что mapName был передан
    if not map_name:
        return jsonify({"error": "mapName is required"}), 400

    # Путь к файлу конфигурации карты
    config_file_path = os.path.join(CONFIG_PATH, f"{map_name}.json")

    # Проверяем, существует ли файл конфигурации
    if not os.path.isfile(config_file_path):
        return jsonify({"error": f"Configuration file for map '{map_name}' not found"}), 404

    # Загрузка данных из файла конфигурации карты
    try:
        with open(config_file_path, 'r') as f:
            map_config = json.load(f)
    except json.JSONDecodeError:
        return jsonify({"error": f"Error decoding JSON in file '{config_file_path}'"}), 500

    # Дополняем конфигурацию карты новыми данными из запроса
    map_config['polygons'] = polygons
    map_config['mapState'] = map_state

    # Здесь можно сохранить или обработать обновленные данные
    print("Received polygons data:", polygons)
    print("Received map state:", map_state)
    print("Updated map configuration:", map_config)

    # Сохраняем обновленный JSON обратно в файл
    try:
        with open(config_file_path, 'w') as f:
            json.dump(map_config, f, indent=4)  # Сохранение с отступами для удобства чтения
    except IOError:
        return jsonify({"error": f"Error saving updated configuration to '{config_file_path}'"}), 500

    # Возвращаем обновленную конфигурацию как подтверждение
    return jsonify({"status": "success", "updatedConfig": map_config})

if __name__ == '__main__':
    app.run(debug=True)
