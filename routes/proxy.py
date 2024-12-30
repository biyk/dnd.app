import requests
from flask import Blueprint, request, Response, jsonify

# Создаем Blueprint для API прокси
proxy_bp = Blueprint('proxy', __name__)

@proxy_bp.route('/api/proxy/<path:url>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy(url):
    fetch = "https://"+url
    headers = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-length": "0",
        "cookie": "ttg_theme_name=light",
        "dnt": "1",
        "origin": "https://ttg.club",
        "priority": "u=1, i",
        "referer": "https://ttg.club/items/magic/ruin's_wake",
        "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    }

    response = requests.post(fetch, headers=headers)

    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
    return response.json()


