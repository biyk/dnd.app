import requests
from bs4 import BeautifulSoup
import logging
import re
import sqlite3

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s',
                    filename='monster_parsing.log')
logger = logging.getLogger(__name__)

# Базовый URL сайта
base_url = "https://dnd.su"

# Настройка базы данных SQLite
db_name = "../data/data.db"


def setup_database():
    """
    Создаёт таблицу monsters, если она не существует.
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monsters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            url TEXT UNIQUE,
            armor_class TEXT,
            hit_points TEXT,
            hit_dice TEXT,
            challenge_rating TEXT,
            experience TEXT
        )
    ''')
    conn.commit()
    conn.close()


def save_or_update_monster(monster_data):
    """
    Сохраняет данные о монстре в таблицу monsters, если такой записи ещё нет.
    Если запись с таким URL уже существует, обновляет её.
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Проверка на существование записи с таким URL
    cursor.execute("SELECT id FROM monsters WHERE url = ?", (monster_data['url'],))
    result = cursor.fetchone()

    if result:
        # Обновление существующей записи
        cursor.execute('''
            UPDATE monsters
            SET name = ?, armor_class = ?, hit_points = ?, hit_dice = ?, 
                challenge_rating = ?, experience = ?
            WHERE url = ?
        ''', (
            monster_data['name'],
            monster_data.get('armor_class', 'Не найдено'),
            monster_data.get('hit_points', 'Не найдено'),
            monster_data.get('hit_dice', 'Не найдено'),
            monster_data.get('challenge_rating', 'Не найдено'),
            monster_data.get('experience', 'Не найдено'),
            monster_data['url']
        ))
        logger.info(f"Запись для {monster_data['name']} обновлена в базе данных")
    else:
        # Вставка новой записи
        cursor.execute('''
            INSERT INTO monsters (name, url, armor_class, hit_points, hit_dice, challenge_rating, experience)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            monster_data['name'],
            monster_data['url'],
            monster_data.get('armor_class', 'Не найдено'),
            monster_data.get('hit_points', 'Не найдено'),
            monster_data.get('hit_dice', 'Не найдено'),
            monster_data.get('challenge_rating', 'Не найдено'),
            monster_data.get('experience', 'Не найдено')
        ))
        logger.info(f"Новая запись для {monster_data['name']} добавлена в базу данных")

    conn.commit()
    conn.close()


def get_monster_links():
    """
    Загружает главную страницу бестиария и парсит ссылки на страницы с описанием монстров.
    Возвращает список словарей с названиями монстров и их ссылками.
    """
    url = f"{base_url}/bestiary/"
    logger.info(f"Загружаем страницу с бестиарием: {url}")

    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Ошибка при загрузке страницы {url}: {e}")
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    monsters = []

    # Парсим ссылки и названия монстров
    for link in soup.select("a.list-item-wrapper"):
        monster_name = link.find("div", class_="list-item-title").text.strip()
        monster_link = link["href"]
        monsters.append({"name": monster_name, "link": monster_link})
        logger.info(f"Найден монстр: {monster_name} ({monster_link})")

    return monsters


def parse_monster_info(url):
    """
    Парсит информацию о монстре по указанному URL.
    Возвращает словарь с данными о Классе доспехов, Хитах, Опасности и опыте.
    """
    full_url = f"{base_url}{url}"
    logger.info(f"Начинаем парсинг страницы: {full_url}")

    try:
        response = requests.get(full_url)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Ошибка при запросе страницы {full_url}: {e}")
        return None

    # Парсим страницу
    soup = BeautifulSoup(response.text, 'html.parser')
    monster_data = {}

    try:
        # Класс Доспеха
        ac_element = soup.find('strong', text="Класс Доспеха")
        if ac_element:
            ac_text = ac_element.find_next_sibling(text=True).strip()
            armor_class = re.search(r'\d+', ac_text)
            monster_data['armor_class'] = armor_class.group(0) if armor_class else "Не найдено"
            logger.info(f"Класс Доспеха: {monster_data['armor_class']}")
        else:
            monster_data['armor_class'] = "Не найдено"
            logger.warning(f"Класс Доспеха не найден на странице {full_url}")

        # Хиты
        hp_element = soup.find('strong', text="Хиты")
        if hp_element:
            hp_text = hp_element.find_next_sibling('span', {'data-type': 'middle'})
            monster_data['hit_points'] = hp_text.text.strip() if hp_text else "Не найдено"

            hp_dice = hp_element.find_next_sibling('span', {'data-type': 'throw'})
            dice_value = hp_element.find_next_sibling('span', {'data-type': 'dice'})
            monster_data['hit_dice'] = f"{hp_dice.text}к{dice_value.text}" if hp_dice and dice_value else "Не найдено"
            logger.info(f"Хиты: {monster_data['hit_points']} ({monster_data['hit_dice']})")
        else:
            monster_data['hit_points'] = "Не найдено"
            monster_data['hit_dice'] = "Не найдено"
            logger.warning(f"Хиты не найдены на странице {full_url}")

        # Опасность
        cr_element = soup.find('strong', text="Опасность")
        if cr_element:
            cr_text = cr_element.find_next_sibling(text=True).strip()
            monster_data['challenge_rating'] = cr_text.split()[0]
            xp_start = cr_text.find("(") + 1
            xp_end = cr_text.find(" опыта)")
            monster_data['experience'] = cr_text[
                                         xp_start:xp_end].strip() if xp_start > 0 and xp_end > xp_start else "Не найдено"
            logger.info(f"Опасность: {monster_data['challenge_rating']}, Опыт: {monster_data['experience']}")
        else:
            monster_data['challenge_rating'] = "Не найдено"
            monster_data['experience'] = "Не найдено"
            logger.warning(f"Опасность не найдена на странице {full_url}")

    except Exception as e:
        logger.error(f"Ошибка при парсинге данных на странице {full_url}: {e}")
        return None

    return monster_data


def process_monsters():
    """
    Загружает ссылки на монстров с главной страницы, парсит данные о каждом монстре и сохраняет в SQLite.
    """
    setup_database()  # Создаем таблицу, если ещё не создана
    monsters = get_monster_links()

    # Обработка каждого монстра
    for monster in monsters:
        url = monster["link"]
        logger.info(f"Обработка монстра {monster['name']} по ссылке {url}")

        try:
            monster_info = parse_monster_info(url)
            if monster_info:
                monster_info['name'] = monster["name"]
                monster_info['url'] = f"{base_url}{url}"
                save_or_update_monster(monster_info)
            else:
                logger.warning(f"Не удалось получить данные для {monster['name']}")
        except Exception as e:
            logger.error(f"Ошибка при обработке {url}: {e}")


# Пример вызова функции
process_monsters()
