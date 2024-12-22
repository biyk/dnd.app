import sqlite3

from flask import jsonify

DATABASE = "./data/data.db"


def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def get_main_location():
    with get_db_connection() as conn:
        main_location = conn.execute("""
            SELECT id FROM locations 
            WHERE type = 'main' AND active = 1
        """).fetchone()
    return main_location


def fetch_monsters_by_name(name_query):
    variants = [name_query.lower(), name_query.capitalize(), name_query.upper()]
    query = f"""
        SELECT * FROM monsters
        WHERE {" OR ".join(["name LIKE ?"] * len(variants))} LIMIT 10
    """
    with get_db_connection() as conn:
        return conn.execute(query, tuple(f"%{v}%" for v in variants)).fetchall()


def fetch_spells_by_name(name_query):
    variants = [name_query.lower(), name_query.capitalize(), name_query.upper()]
    query = f"""
        SELECT * FROM spells
        WHERE {" OR ".join(["name LIKE ?"] * len(variants))} LIMIT 10
    """
    with get_db_connection() as conn:
        return conn.execute(query, tuple(f"%{v}%" for v in variants)).fetchall()


def fetch_npc_by_name(name=None):
    with get_db_connection() as conn:
        if name:
            return conn.execute("SELECT * FROM npc WHERE name = ?", (name,)).fetchall()
        return conn.execute("SELECT * FROM npc").fetchall()


def add_npc(name, cd, health, text, template):
    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO npc (name, cd, hp, text, template)
            VALUES (?, ?, ?, ?, ?)
        """, (name, cd, health, text, template))
        conn.commit()


def delete_npc(id):
    with get_db_connection() as conn:
        npc = conn.execute("SELECT * FROM npc WHERE id = ?", (id,)).fetchone()
        if not npc:
            return False
        conn.execute("DELETE FROM npc WHERE id = ?", (id,))
        conn.commit()
        return True


def record_exists(table, column, value):
    """Проверяет, существует ли запись в таблице"""
    query = f"SELECT 1 FROM {table} WHERE {column} = ?"
    with get_db_connection() as conn:
        return conn.execute(query, (value,)).fetchone() is not None
