import os
import sys
import webbrowser
from flask import Flask

# Определяем базовый путь приложения
if getattr(sys, 'frozen', False):
    app_path = os.path.dirname(sys.executable)
else:
    app_path = os.path.dirname(os.path.abspath(__file__))

# Определяем путь к конфигурациям и изображениям
CONFIG_PATH = os.path.join(app_path, 'configs')
IMAGES_PATH = os.path.join(app_path, 'images')

def create_app():
    # Создаем экземпляр приложения Flask
    app = Flask(__name__, template_folder=os.path.join(app_path, 'templates'))

    # Добавляем конфигурационные пути в настройки приложения
    app.config['CONFIG_PATH'] = CONFIG_PATH
    app.config['IMAGES_PATH'] = IMAGES_PATH

    # Импортируем и регистрируем blueprints
    from routes.index import index_bp
    from routes.config import config_bp
    from routes.polygons import polygons_bp
    from routes.data import data_bp

    app.register_blueprint(index_bp)
    app.register_blueprint(config_bp, url_prefix='/api')
    app.register_blueprint(polygons_bp, url_prefix='/api')
    app.register_blueprint(data_bp, url_prefix='/api')

    return app

# Запускаем приложение
if __name__ == '__main__':
    app = create_app()
    # webbrowser.open("http://127.0.0.1:5000/")
    app.run(host='0.0.0.0', debug=True, use_reloader=True)

