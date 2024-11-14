import fitz  # PyMuPDF для работы с PDF-документом
import spacy
import re
import requests
import json
import os

# Загружаем модель spaCy для обработки русского текста
nlp = spacy.load("ru_core_news_sm")
nlp.max_length = 1_500_000  # Увеличиваем максимальную длину текста


# Функция для извлечения текста из PDF с возможностью извлечения по страницам
def extract_text_from_pdf(file_path):
    print("Шаг 1: Извлечение текста из PDF...")
    text_pages = []
    with fitz.open(file_path) as pdf:
        for page_num in range(pdf.page_count):
            print(f"  Извлечение текста со страницы {page_num + 1}/{pdf.page_count}")
            text_pages.append(pdf[page_num].get_text())
    print("  Извлечение текста завершено.")
    return text_pages


# Функция для извлечения списка персонажей через Ollama для каждой страницы
def extract_characters_list_from_pages(text_pages, base_url="http://192.168.1.50:11434/", model="gemma2"):
    print("Шаг 2: Определение списка персонажей по страницам через Ollama...")
    all_characters = set()  # Используем множество, чтобы избежать дубликатов
    prompt_template = (
        "Ты Endpoint API ты отвечаешь только в формате json "
        "Определи всех персонажей, упоминающихся в тексте, и верни их в формате JSON-списка имен. "
        "пример ответа: [\"Джимджар\", \"Лилит\"] или [] если ничего похожено не нашлось"
        "ВАЖНО: в ответе должен быть только json без форматирования!"
    )

    for i, page_text in enumerate(text_pages):
        print(f"  Обработка текста на странице {i + 1}")
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt_template + f"\n\n{page_text}"}]
        }

        response = requests.post(
            f"{base_url}v1/chat/completions",
            headers={
                "Authorization": "Bearer YOUR_API_KEY",  # Замените YOUR_API_KEY на ваш API-ключ
                "Content-Type": "application/json"
            },
            data=json.dumps(payload)
        )

        if response.status_code == 200:
            page_characters_json = response.json().get("choices", [{}])[0].get("message", {}).get("content", "[]")
            try:
                page_characters = json.loads(page_characters_json)
                all_characters.update(page_characters)
            except json.JSONDecodeError:
                print(f"  Ошибка в ответе JSON на странице {i + 1}. Ответ: {page_characters_json}")
        else:
            print(f"  Ошибка при получении списка персонажей на странице {i + 1}: {response.status_code}")
            print(response.text)

    return list(all_characters)  # Преобразуем множество обратно в список


# Функция для обработки текста по частям для поиска информации по конкретному персонажу
def process_text_in_chunks(text, character_name, chunk_size=500_000):
    print(f"Обработка текста по частям для поиска информации о персонаже '{character_name}'...")
    chunks = []
    for i in range(0, len(text), chunk_size):
        print(f"  Обработка части текста с символа {i} по {i + chunk_size}")
        chunk = text[i:i + chunk_size]
        relevant_text = extract_relevant_text(chunk, character_name)
        chunks.append(relevant_text)
    return "\n".join(chunks)


# Функция для фильтрации текста, извлекая блоки с упоминаниями персонажа
def extract_relevant_text(text, character_name):
    relevant_text = []
    doc = nlp(text)
    sentences = list(doc.sents)

    pattern = re.compile(rf'\b{character_name}\b', re.IGNORECASE | re.UNICODE)

    for sent in sentences:
        if pattern.search(sent.text):
            relevant_text.append(sent.text)
    return "\n".join(relevant_text)


# Функция для запроса суммирования информации о персонаже через Ollama
def summarize_character_info(text, character_name, base_url="http://192.168.1.50:11434/", model="mistral:7b-instruct"):
    print(f"Суммирование информации о персонаже '{character_name}'...")
    prompt = (f"Собери всю доступную информацию о персонаже по имени '{character_name}' из текста ниже. "
              f"Выводи только информацию, которая явно связана с этим персонажем. Если информации нет, оставь строку пустой:\n\n{text}")

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    response = requests.post(
        f"{base_url}v1/chat/completions",
        headers={
            "Authorization": "Bearer YOUR_API_KEY",  # Замените YOUR_API_KEY на ваш API-ключ
            "Content-Type": "application/json"
        },
        data=json.dumps(payload)
    )

    if response.status_code == 200:
        print(f"  Информация о персонаже '{character_name}' успешно получена.")
        return response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
    else:
        print(f"  Ошибка при суммировании информации о персонаже '{character_name}': {response.status_code}")
        print(response.text)
        return None


# Основной код
file_path = "Out of the Abyss-136-146.pdf"  # Путь к вашему PDF-файлу
output_dir = "character_info"  # Директория для файлов с информацией о персонажах
os.makedirs(output_dir, exist_ok=True)

# Шаг 1: Извлекаем текст из PDF по страницам
pdf_text_pages = extract_text_from_pdf(file_path)

# Шаг 2: Получаем список всех персонажей, проходя по страницам
characters = extract_characters_list_from_pages(pdf_text_pages)

# Шаг 3: Обрабатываем информацию по каждому персонажу и сохраняем результаты в отдельные файлы
for character_name in characters:
    print(f"\nНачинается обработка персонажа: {character_name}")

    # Объединяем текст всех страниц и извлекаем релевантные фрагменты для персонажа
    full_text = "\n".join(pdf_text_pages)
    relevant_text = process_text_in_chunks(full_text, character_name)

    # Суммирование информации о персонаже
    summarized_info = summarize_character_info(relevant_text, character_name)

    # Сохранение итоговой информации в файл
    output_file = os.path.join(output_dir, f"{character_name}.txt")
    print(f"Сохранение информации о персонаже '{character_name}' в файл '{output_file}'...")
    if summarized_info:
        with open(output_file, "w", encoding="utf-8") as file:
            file.write(summarized_info)
        print(f"  Информация о персонаже '{character_name}' успешно сохранена.")
    else:
        print(f"  Не удалось получить информацию о персонаже '{character_name}'.")
