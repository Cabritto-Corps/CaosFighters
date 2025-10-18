import requests
import json
import psycopg2
from psycopg2.extras import Json
import os
from typing import Dict, Any

def load_db_config() -> Dict[str, str]:
    env_path = os.path.join(os.path.dirname(__file__), '.env')

    if not os.path.exists(env_path):
        raise FileNotFoundError(f".env file not found at {env_path}")

    config: Dict[str, str] = {}

    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue

            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip().lower()
                value = value.strip().strip('"').strip("'")
                config[key] = value

    required_fields = ['host', 'dbname', 'user', 'password', 'port']
    missing = [field for field in required_fields if not config.get(field)]

    if missing:
        raise ValueError(f"Missing required database config fields in .env: {', '.join(missing)}")

    return {
        'host': config['host'],
        'database': config['dbname'],
        'user': config['user'],
        'password': config['password'],
        'port': config['port']
    }

DB_CONFIG = load_db_config()

POKEAPI_BASE_URL = "https://pokeapi.co/api/v2/pokemon"

def fetch_pokemon_data(pokemon_id: int) -> Dict[str, Any]:
    try:
        response = requests.get(f"{POKEAPI_BASE_URL}/{pokemon_id}")
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"Error fetching Pokemon {pokemon_id}: {e}")
        return None

def transform_pokemon_stats(pokemon_data: Dict[str, Any]) -> Dict[str, Any]:
    stats = {stat['stat']['name']: stat['base_stat'] for stat in pokemon_data['stats']}

    attack_avg = round((stats['attack'] + stats['special-attack']) / 2)
    defense_avg = round((stats['defense'] + stats['special-defense']) / 2)
    
    return {
        'name': pokemon_data['name'].capitalize(),
        'form_id': pokemon_data['id'],
        'status': {
            'hp': stats['hp'],
            'agility': stats['speed'],
            'strength': attack_avg,
            'defense': defense_avg
        }
    }

def get_or_create_placeholder_tier(cursor) -> int:
    cursor.execute("SELECT id FROM public.tiers WHERE name = %s", ('Placeholder',))
    result = cursor.fetchone()
    
    if result:
        return result[0]

    cursor.execute(
        "INSERT INTO public.tiers (name, description) VALUES (%s, %s) RETURNING id",
        ('Placeholder', 'Temporary tier for initial Pokemon data')
    )
    return cursor.fetchone()[0]


def clear_characters_table(cursor) -> None:
    cursor.execute("TRUNCATE TABLE public.characters RESTART IDENTITY CASCADE")


def reset_tiers_sequence(cursor) -> None:
    cursor.execute(
        """
        SELECT setval(
            pg_get_serial_sequence('public.tiers', 'id'),
            COALESCE((SELECT MAX(id) FROM public.tiers), 0)
        )
        """
    )

def insert_character(cursor, character_data: Dict[str, Any], tier_id: int) -> bool:
    try:
        cursor.execute(
            "INSERT INTO public.characters (tier_id, form_id, name, status) VALUES (%s, %s, %s, %s)",
            (tier_id, character_data['form_id'], character_data['name'], Json(character_data['status']))
        )
        return True
    except psycopg2.IntegrityError as e:
        print(f"Character {character_data['name']} already exists, skipping...")
        return False
    except Exception as e:
        print(f"Error inserting character {character_data['name']}: {e}")
        return False

def main():
    print("Starting Pokemon character population...")
    
    password = DB_CONFIG.get('password')
    if not password or password in {'[YOUR-PASSWORD]', '[mypassword]'}:
        print("\Please update the password in the .env file!")
        print("Replace the placeholder password (e.g. [YOUR-PASSWORD]) with your actual Supabase password.")
        return
    
    conn = None
    cursor = None

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        reset_tiers_sequence(cursor)

        tier_id = get_or_create_placeholder_tier(cursor)
        print(f"Using tier ID: {tier_id}")

        clear_characters_table(cursor)
        print("Cleared existing characters from database.")

        successful_inserts = 0
        
        for pokemon_id in range(1, 10):
            print(f"\nProcessing Pokemon #{pokemon_id}...")
            
            pokemon_data = fetch_pokemon_data(pokemon_id)
            if not pokemon_data:
                continue
            
            character_data = transform_pokemon_stats(pokemon_data)
            print(f"  Name: {character_data['name']}")
            print(f"  Form ID: {character_data['form_id']}")
            print(f"  Stats: {character_data['status']}")
            
            if insert_character(cursor, character_data, tier_id):
                successful_inserts += 1
                print(f"Successfully inserted {character_data['name']}")
            else:
                print(f"Failed to insert {character_data['name']}")
        
        conn.commit()
        print(f"\nSuccessfully populated {successful_inserts} characters!")
        
    except psycopg2.Error as e:
        print(f"Database error: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"Unexpected error: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("\nDatabase connection closed.")

if __name__ == "__main__":
    main()