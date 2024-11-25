from flask import Blueprint, render_template, Flask, request, jsonify
import os
from flask import request, render_template, send_file
from bs4 import BeautifulSoup  # Убедитесь, что библиотека установлена
import sqlite3

from units.database import get_db_connection

app = Flask(__name__)

DATABASE = "data/data.db"

test_bp = Blueprint('test', __name__)

@test_bp.route('/test/start', methods=['GET'])
def test_start():
    # сделать копию файла конфигов
    with get_db_connection() as conn:
        conn.execute("DELETE FROM npc WHERE id = ?", (id,))
        conn.commit()
    return ;
