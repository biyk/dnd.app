from flask import Blueprint, render_template
from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

DATABASE = "data/data.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Создаем Blueprint для главной страницы
data_bp = Blueprint('data', __name__)

@data_bp.route('/data/monsters', methods=['GET'])
def get_monsters():
    name_query = request.args.get('name', '').strip()  # Получаем запрос пользователя
    if not name_query:
        return jsonify([])

    # Генерируем возможные варианты регистра
    variants = [name_query.lower(), name_query.capitalize(), name_query.upper()]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Создаём SQL-запрос с несколькими LIKE
    conditions = " OR ".join(["name LIKE ?"] * len(variants))
    query = f"""
        SELECT * FROM monsters
        WHERE {conditions} LIMIT 10
    """
    cursor.execute(query, tuple(f"%{v}%" for v in variants))
    results = cursor.fetchall()
    conn.close()

    # Формируем JSON со всеми полями
    return jsonify([dict(row) for row in results])