import pygetwindow as gw
import pyautogui
import time


def map_click(window):
    # Найти окно браузера по заголовку
    windows = [w for w in gw.getWindowsWithTitle(window) if w.isActive or w.visible]
    if not windows:
        print("Окно браузера не найдено.")
    else:
        browser_window = windows[0]

        # Активировать окно браузера
        browser_window.activate()
        time.sleep(0.5)  # Небольшая задержка для фокусировки

        # Определение размеров окна
        left, top, width, height = browser_window.left, browser_window.top, browser_window.width, browser_window.height

        # Вычисление центра окна
        center_x = left + width // 2
        center_y = top + height // 2

        print(f"Центр окна браузера: ({center_x}, {center_y})")

        # Перемещение мышки и клик в центре окна
        pyautogui.moveTo(center_x, center_y)
        pyautogui.click()