1. Для новой локации берем приложение https://github.com/upscayl и увеличиваем разрешение исходной картинки до приемлемого качества
2. Режем картинку на тайлы при помощи приложения https://github.com/oliverheilig/LeafletPano и кладем картинки в папку templates/images
3. Прописываем сгененированные данные в файл index.html
4. Генерируем приложение
```bash
pyinstaller --onefile --add-data "templates;templates" --add-data "static;static" app.py ; rm .\app.exe; move dist\app.exe .; rm dist
```
