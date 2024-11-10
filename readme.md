1. Для новой локации берем приложение https://github.com/upscayl и увеличиваем разрешение исходной картинки до приемлемого качества
2. Режем картинку на тайлы при помощи приложения https://github.com/oliverheilig/LeafletPano и кладем картинки в папку /images
3. Запускаем сервер app.py - он должен создать конфиг и именем папки в [configs](configs)
4. Прописываем сгененированные данные в файл конфиге
5. Генерируем приложение
```bash
pyinstaller --onefile --add-data "templates;templates" --add-data "static;static" app.py ; rm .\app.exe; move dist\app.exe .; rm dist
```

