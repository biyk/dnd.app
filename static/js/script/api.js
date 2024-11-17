
// Функция для получения начальной конфигурации
export async function getInit() {
  const response = await fetch('/api/config');
  if (response.ok) {
    return response.json();
  } else {
    console.error("Error fetching initial config");
    return null;
  }
}

// Функция для получения конфигурации карты по имени
export async function getConfig(mapName) {
  const response = await fetch(`/api/configs/${mapName}`);
  if (response.ok) {
    return response.json();
  } else {
    console.error(`Error fetching map config for ${mapName}`);
    return null;
  }
}