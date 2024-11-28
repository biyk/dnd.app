from flask import Blueprint, render_template, Flask, request, jsonify
import os
from flask import request, render_template, send_file
from bs4 import BeautifulSoup  # Убедитесь, что библиотека установлена
import sqlite3

from shapely import Polygon

from routes.config import load_config, query_main_active_location, save_config
from units.database import get_db_connection

app = Flask(__name__)

DATABASE = "data/data.db"

test_bp = Blueprint('test', __name__)

@test_bp.route('/test/start', methods=['GET'])
def test_start():
    # сделать копию файла конфигов
    map = query_main_active_location()
    data = load_config(map)
    save_config('backup/'+map, data)
    return jsonify({"status": "success"})


@test_bp.route('/test/polygon/<int:id>', methods=['GET'])
def test_poligon(id):
    # сделать копию файла конфигов
    map = query_main_active_location()
    data = load_config(map)
    if id < 0 or id >= len(data['polygons']):
        return jsonify({"status": "error", "message": f"Polygon with id {id} not found"}), 404

    points = data['polygons'][id]['points']
    polygon = Polygon(points)

    # Находим центроид
    centroid = polygon.centroid
    return jsonify({"status": "success", "centroid": [centroid.x, centroid.y]})