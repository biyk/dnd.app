from flask import Blueprint, render_template

# Создаем Blueprint для главной страницы
index_bp = Blueprint('index', __name__)

@index_bp.route('/')
def index():
    return render_template('index.html')  # Возвращаем HTML страницу (индекс)

@index_bp.route('/admin')
def admin():
    return render_template('admin.html')  # Возвращаем HTML страницу (индекс)