import requests
from bs4 import BeautifulSoup
import logging
import re
import sqlite3
import os
import json

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s',
                    filename='monster_parsing.log')
logger = logging.getLogger(__name__)

# Базовый URL сайта
base_url = "https://dnd.su"

# Настройка базы данных SQLite
db_name = "../data/data.db"

# Директория для сохранения скачанных страниц
cache_dir = "dndsu"
os.makedirs(cache_dir, exist_ok=True)

def migrate_database():
    """
    Проверяет типы полей таблицы monsters и, если необходимо, меняет их на требуемые.
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Проверяем, существует ли таблица monsters и имеет ли поля с типом TEXT
    cursor.execute("PRAGMA table_info(monsters)")
    columns = cursor.fetchall()

    # Определяем, если нужно выполнить миграцию
    migration_needed = any(
        col[1] in ["armor_class", "hit_points", "hit_dice", "challenge_rating", "experience"] and col[2] == "TEXT"
        for col in columns
    )

    if migration_needed:
        logger.info("Начинается миграция базы данных для изменения типов полей...")

        # Создаем новую таблицу с правильными типами данных
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS monsters_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                url TEXT UNIQUE,
                armor_class INTEGER,
                hit_points INTEGER,
                hit_dice TEXT,
                challenge_rating REAL,
                experience INTEGER
            )
        ''')

        # Копируем данные из старой таблицы в новую, преобразуя типы
        cursor.execute('''
            INSERT INTO monsters_new (name, url, armor_class, hit_points, hit_dice, challenge_rating, experience)
            SELECT 
                name,
                url,
                CASE WHEN armor_class GLOB '*[0-9]*' THEN CAST(armor_class AS INTEGER) ELSE 0 END,
                CASE WHEN hit_points GLOB '*[0-9]*' THEN CAST(hit_points AS INTEGER) ELSE 0 END,
                CASE WHEN hit_dice GLOB '*[0-9]*' THEN CAST(hit_dice AS TEXT) ELSE 0 END,
                CASE 
                    WHEN challenge_rating LIKE '1/2' THEN 0.5
                    WHEN challenge_rating LIKE '1/4' THEN 0.25
                    WHEN challenge_rating LIKE '1/8' THEN 0.125
                    WHEN challenge_rating GLOB '*[0-9]*' THEN CAST(challenge_rating AS REAL)
                    ELSE 0.0
                END,
                CASE WHEN experience GLOB '*[0-9]*' THEN CAST(experience AS INTEGER) ELSE 0 END
            FROM monsters
        ''')

        # Удаляем старую таблицу и переименовываем новую таблицу
        cursor.execute("DROP TABLE monsters")
        cursor.execute("ALTER TABLE monsters_new RENAME TO monsters")
        conn.commit()
        logger.info("Миграция завершена успешно.")
    else:
        logger.info("Миграция не требуется, типы полей уже соответствуют требованиям.")

    conn.close()



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
            armor_class INTEGER,
            hit_points INTEGER,
            hit_dice TEXT,
            challenge_rating REAL,
            experience INTEGER
        )
    ''')
    conn.commit()
    conn.close()


def save_or_update_spell(card):
    """
    Сохраняет данные о монстре в таблицу monsters, если такой записи ещё нет.
    Если запись с таким URL уже существует, обновляет её.
    """
    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()

    # Проверка на существование записи с таким URL
    cursor.execute("SELECT id FROM spells WHERE link = ?", (card['link'],))
    result = cursor.fetchone()

    if result:
        # Обновление существующей записи
        cursor.execute('''
            UPDATE spells
            SET name = ?,
             ac = ?,
             time = ?,
             ritual = ?
            WHERE link = ?
        ''', (
            card['title'],
            card['ac'],
            card['time'],
            card['ritual'],
            card['link']
        ))
        logger.info(f"Запись для {card['title']} обновлена в базе данных")
    else:
        # Вставка новой записи
        cursor.execute('''
            INSERT INTO spells (name, link)
            VALUES (?, ?)
        ''', (
            card['title'],
            card['link'],

        ))
        logger.info(f"Новая запись для {card['title']} добавлена в базу данных")

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
            monster_data.get('armor_class', 0),
            monster_data.get('hit_points', 0),
            monster_data.get('hit_dice', ''),
            monster_data.get('challenge_rating', 0.0),
            monster_data.get('experience', 0),
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
            monster_data.get('armor_class', 0),
            monster_data.get('hit_points', 0),
            monster_data.get('hit_dice', ''),
            monster_data.get('challenge_rating', 0.0),
            monster_data.get('experience', 0)
        ))
        logger.info(f"Новая запись для {monster_data['name']} добавлена в базу данных")

    conn.commit()
    conn.close()


def parse_fraction(value):
    """
    Преобразует строку с дробью вида '1/4' в число с плавающей точкой.
    Если строка не содержит дробь, пытается преобразовать в float.
    """
    if '/' in value:
        num, denom = value.split('/')
        return float(num) / float(denom)
    else:
        return float(value)


def get_spells_cards():
    # Открываем и читаем содержимое файла spells.json
    with open('spells.json', 'r', encoding='utf-8') as file:
        data = json.load(file)

    # Извлекаем ссылки из каждого объекта в списке "cards"
    cards = [card for card in data['cards']]
    return cards

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


def fetch_page(url, filename):
    """
    Скачивает страницу по URL и сохраняет её в файл, если ещё не была скачана.
    Возвращает содержимое страницы.
    """
    filepath = os.path.join(cache_dir, filename)

    # Проверяем, скачана ли страница
    if os.path.exists(filepath):
        logger.info(f"Используем сохраненную страницу: {filepath}")
        with open(filepath, 'r', encoding='utf-8') as file:
            return file.read()

    # Если страницы нет, загружаем её
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Ошибка при запросе страницы {url}: {e}")
        return None

    # Сохраняем скачанную страницу
    with open(filepath, 'w', encoding='utf-8') as file:
        file.write(response.text)
    logger.info(f"Скачанная страница сохранена: {filepath}")

    return response.text


def parse_spell_info(url):
    full_url = f"{base_url}{url}"
    filename = f"{url.strip('/').replace('/', '_')}.html"

    logger.info(f"Начинаем парсинг страницы: {full_url}")
    page_content = fetch_page(full_url, filename)
    if not page_content:
        return None

    # Парсим страницу
    soup = BeautifulSoup(page_content, 'html.parser')
    spell_data = {}

    try:
        # Уровень ячейки
        ac_element = soup.find(class_="size-type-alignment")
        if ac_element:
            ac_text = ac_element.text.strip()
            a_class = re.search(r'\d+', ac_text)
            spell_data['ac'] = int(a_class.group(0)) if a_class else 0
            spell_data['ritual'] = '(ритуал)' in ac_text.lower()
            logger.info(f"Уровень заклинания: {spell_data['ac']}")
        else:
            spell_data['ac'] = 0
            spell_data['ritual'] = False
            logger.warning(f"Уровень заклинания не найден на странице {full_url}")

        # Время накладывания
        time_element = soup.find('strong', string="Время накладывания:")
        if time_element:
            # Переходим к следующему текстовому узлу после тега <strong>
            time_text = time_element.next_sibling.strip() if time_element.next_sibling else None
            if time_text:
                spell_data['time'] = time_text
                logger.info(f"Время накладывания: {spell_data['time']}")
            else:
                logger.warning(f"Не удалось извлечь текст времени накладывания на странице {full_url}")
        else:
            logger.warning(f"Время накладывания не найдено на странице {full_url}")



    except Exception as e:
        logger.error(f"Ошибка при парсинге данных на странице {full_url}: {e}")
        return None

    return spell_data


def parse_monster_info(url):
    """
    Парсит информацию о монстре по указанному URL.
    Возвращает словарь с данными о Классе доспехов, Хитах, Опасности и опыте.
    """
    full_url = f"{base_url}{url}"
    filename = f"{url.strip('/').replace('/', '_')}.html"

    logger.info(f"Начинаем парсинг страницы: {full_url}")
    page_content = fetch_page(full_url, filename)
    if not page_content:
        return None

    # Парсим страницу
    soup = BeautifulSoup(page_content, 'html.parser')
    monster_data = {}

    try:
        # Класс Доспеха
        ac_element = soup.find('strong', string="Класс Доспеха")
        if ac_element:
            ac_text = ac_element.find_next_sibling(string=True).strip()
            armor_class = re.search(r'\d+', ac_text)
            monster_data['armor_class'] = int(armor_class.group(0)) if armor_class else 0
            logger.info(f"Класс Доспеха: {monster_data['armor_class']}")
        else:
            monster_data['armor_class'] = 0
            logger.warning(f"Класс Доспеха не найден на странице {full_url}")

        # Хиты
        hp_element = soup.find('strong', string="Хиты")
        if hp_element:
            hp_text = hp_element.find_next_sibling('span', {'data-type': 'middle'})
            monster_data['hit_points'] = int(hp_text.text.strip()) if hp_text else 0

            hp_dice = hp_element.find_next_sibling('span', {'data-type': 'throw'})
            dice_value = hp_element.find_next_sibling('span', {'data-type': 'dice'})
            monster_data['hit_dice'] = f"{hp_dice.text}к{dice_value.text}" if hp_dice and dice_value else ""
            logger.info(f"Хиты: {monster_data['hit_points']} ({monster_data['hit_dice']})")
        else:
            monster_data['hit_points'] = 0
            monster_data['hit_dice'] = ''
            logger.warning(f"Хиты не найдены на странице {full_url}")

        # Опасность
        cr_element = soup.find('strong', string="Опасность")
        if cr_element:
            cr_text = cr_element.find_next_sibling(string=True).strip()
            monster_data['challenge_rating'] = parse_fraction(cr_text.split()[0])

            xp_start = cr_text.find("(") + 1
            xp_end = cr_text.find(" опыта)")
            monster_data['experience'] = int(cr_text[xp_start:xp_end].strip()) if xp_start > 0 and xp_end > xp_start else 0
            logger.info(f"Опасность: {monster_data['challenge_rating']}, Опыт: {monster_data['experience']}")
        else:
            monster_data['challenge_rating'] = 0
            monster_data['experience'] = 0
            logger.warning(f"Опасность не найдена на странице {full_url}")

    except Exception as e:
        logger.error(f"Ошибка при парсинге данных на странице {full_url}: {e}")
        return None

    return monster_data

def process_spells():
    cards = get_spells_cards()
    for card in cards:
        spell_info = parse_spell_info(card['link'])
        card['ac'] = spell_info['ac']
        card['time'] = spell_info['time']
        card['ritual'] = spell_info['ritual']
        save_or_update_spell(card)

def process_monsters():
    """
    Загружает ссылки на монстров с главной страницы, парсит данные о каждом монстре и сохраняет в SQLite.
    """
    # Вызов миграции базы данных перед основными операциями
    migrate_database()
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
# process_monsters()
process_spells()
