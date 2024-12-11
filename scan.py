import os

def collect_project_code(root_dir, output_file, include_extensions=None, ignore_dirs=None):
    """
    Собирает код проекта в указанный файл.

    :param root_dir: Корневая директория проекта.
    :param output_file: Имя выходного файла.
    :param include_extensions: Список расширений файлов для включения (например, [".py", ".js"]).
    :param ignore_dirs: Список директорий для игнорирования.
    """
    if include_extensions is None:
        include_extensions = [".py", ".js", ".html", ".css"]  # Расширения по умолчанию

    if ignore_dirs is None:
        ignore_dirs = []

    with open(output_file, "w", encoding="utf-8") as out_file:
        for root, dirs, files in os.walk(root_dir):
            # Исключаем игнорируемые директории
            dirs[:] = [d for d in dirs if os.path.join(root, d) not in ignore_dirs]

            for file in files:
                if any(file.endswith(ext) for ext in include_extensions):
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, root_dir)
                    print(relative_path)
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            code = f.read()
                        out_file.write(f"---------------Код {relative_path}:\n")
                        out_file.write(code + "\n\n")
                    except Exception as e:
                        out_file.write(f"Не удалось прочитать файл {relative_path}: {e}\n\n")

if __name__ == "__main__":
    # Пример использования
    ROOT_DIR = os.getcwd()  # Текущая директория
    OUTPUT_FILE = "project_code.txt"  # Имя выходного файла
    INCLUDE_EXTENSIONS = [".py", ".js", ".html"]  # Типы файлов для включения
    INCLUDE_EXTENSIONS = [".js", ".html"]  # Типы файлов для включения
    IGNORE_DIRS = [".git", "venv", "node_modules","build","utils", "migrations", "static\js\external", "static\css\external"]  # Игнорируемые директории

    IGNORE_DIRS_FULL_PATH = [os.path.join(ROOT_DIR, d) for d in IGNORE_DIRS]

    collect_project_code(ROOT_DIR, OUTPUT_FILE, INCLUDE_EXTENSIONS, IGNORE_DIRS_FULL_PATH)
    print(f"Код проекта сохранен в файл {OUTPUT_FILE}")
