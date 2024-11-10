import os
from flask import Blueprint, send_from_directory, current_app

images_bp = Blueprint('images', __name__)

@images_bp.route('/images/<path:filename>')
def serve_image(filename):
    images_path = current_app.config['IMAGES_PATH']
    return send_from_directory(images_path, filename)
