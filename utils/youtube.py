import os
import json
from yt_dlp import YoutubeDL

# Загружаем JSON-файл с ID видео
with open('../static/audio/ambience.json', 'r', encoding='utf-8') as file:
    video_data = json.load(file)


print(video_data)
# Создаем папку audio, если она еще не существует
output_folder = '../static/audio'
if not os.path.exists(output_folder):
    os.makedirs(output_folder)

# Настройки для yt-dlp с VBR
ydl_opts = {
    'format': 'bestaudio/best',  # Выбирает лучший аудиоформат
    'outtmpl': os.path.join(output_folder, '%(id)s.%(ext)s'),  # Сохраняет с названием как ID видео
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
    }, {
        'key': 'FFmpegMetadata'  # Добавляет метаданные для MP3
    }],
    'postprocessor_args': [
        '-ar', '44100',     # Частота дискретизации 44.1 кГц (стандарт для MP3)
        '-q:a', '4',        # Качество VBR от 0 (высокое) до 9 (низкое), 4 — умеренное сжатие
    ],
    'quiet': False  # Отключение лишнего вывода
}

# Функция для скачивания и сжатия аудио
def download_audio(video_id):
    # Определяем путь к выходному файлу
    mp3_path = os.path.join(output_folder, f"{video_id}.mp3")

    # Проверяем, существует ли уже файл с таким именем
    if os.path.exists(mp3_path):
        print(f"Аудио для видео {video_id} уже загружено. Пропускаем.")
        return

    # Загружаем и конвертируем, если файл отсутствует
    try:
        with YoutubeDL(ydl_opts) as ydl:
            ydl.download([f'https://www.youtube.com/watch?v={video_id}'])
        print(f"Аудио для видео {video_id} успешно сохранено и сжато.")
    except Exception as e:
        print(f"Ошибка при скачивании аудио для видео {video_id}: {e}")

# Скачиваем и сжимаем аудио для каждого видео ID из JSON
for video_id in video_data.keys():
    download_audio(video_id)
