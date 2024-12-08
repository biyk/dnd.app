from flask import Blueprint, render_template, Flask, request, jsonify
import os
from flask import request, render_template, send_file
from bs4 import BeautifulSoup  # Убедитесь, что библиотека установлена
import sqlite3

from shapely import Polygon

from routes.config import load_config, query_main_active_location, save_config
from units.click import map_click
from units.database import get_db_connection

app = Flask(__name__)

DATABASE = "data/data.db"

test_bp = Blueprint('test', __name__)

@test_bp.route('/test/start', methods=['GET'])
def test_start():
    BACKUP_DIR = './config/backup'
    # Создать папку для бэкапов, если её нет
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    # Сделать копию файла конфигов
    map = query_main_active_location()
    data = load_config(map)
    save_config(os.path.join(BACKUP_DIR, map), data)
    return jsonify({"status": "success"})

@test_bp.route('/test/end', methods=['GET'])
def test_end():
    BACKUP_DIR = './config/backup/'
    # Восстановить файл конфигов из бэкапа
    map = query_main_active_location()
    backup_file_path = os.path.join(BACKUP_DIR, map)

    data = load_config(backup_file_path)
    print(data,backup_file_path)
    save_config(map, data)

    # Удалить файл бэкапа и папку
    if os.path.exists(backup_file_path):
        os.remove(backup_file_path)

    if os.path.exists(BACKUP_DIR) and not os.listdir(BACKUP_DIR):
        os.rmdir(BACKUP_DIR)

    return jsonify({"status": "success"})



@test_bp.route('/test/polygon/<code>', methods=['GET'])
def test_polygon(code):
    try:
        # Получить карту и загрузить конфиг
        map = query_main_active_location()
        data = load_config(map)

        # Найти полигон с указанным кодом
        points = None
        for poly_data in data.get('polygons', []):
            if poly_data.get('code') == code:
                points = poly_data.get('points')
                break

        # Если не найдено
        if points is None:
            return jsonify({"status": "error", "message": "Polygon not found"}), 404

        # Создать полигон и найти центроид
        polygon = Polygon(points)
        centroid = polygon.centroid

        return jsonify({"status": "success", "centroid": [centroid.x, centroid.y]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@test_bp.route('/test/click/', methods=['GET'])
def do_click():
    map_click(query_main_active_location())
    return jsonify({"status": "success"})