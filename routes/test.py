from flask import Blueprint, render_template, Flask, request, jsonify
import os
from flask import request, render_template, send_file
from bs4 import BeautifulSoup  # Убедитесь, что библиотека установлена
import sqlite3

app = Flask(__name__)

DATABASE = "data/data.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

test_bp = Blueprint('test', __name__)

@test_bp.route('/test/start', methods=['GET'])
def test_start():
    # сделать копию файла конфигов
    return ;
