from units.database import get_db_connection


def insert_record(table, data):
    """Вставляет запись в таблицу"""
    columns = ", ".join(data.keys())
    placeholders = ", ".join("?" for _ in data.values())
    query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"

    with get_db_connection() as conn:
        conn.execute(query, tuple(data.values()))
        conn.commit()


def update_record(table, data, condition):
    """Обновляет запись в таблице"""
    set_clause = ", ".join(f"{key} = ?" for key in data.keys())
    where_clause = " AND ".join(f"{key} = ?" for key in condition.keys())
    query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"

    with get_db_connection() as conn:
        conn.execute(query, tuple(data.values()) + tuple(condition.values()))
        conn.commit()


def delete_record(table, condition):
    """Удаляет запись из таблицы"""
    where_clause = " AND ".join(f"{key} = ?" for key in condition.keys())
    query = f"DELETE FROM {table} WHERE {where_clause}"

    with get_db_connection() as conn:
        conn.execute(query, tuple(condition.values()))
        conn.commit()