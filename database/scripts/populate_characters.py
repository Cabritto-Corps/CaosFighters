import requests
import json
import psycopg2
from psycopg2.extras import Json
import os
from typing import Dict, Any

def load_db_config():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    if not os.path.exists(env_path):
        raise FileNotFoundError(f".env file not found at {env_path}")
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    config = {}
    lines = content.strip().split('\n')
    
    for line in lines[1:-1]: 
        line = line.strip().rstrip(',')
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip().strip('"')
            value = value.strip().strip('"')
            config[key] = value
    
    return {
        'host': config.get('host'),
        'database': config.get('dbname'),
        'user': config.get('user'),
        'password': config.get('password'),
        'port': config.get('port')
    }

DB_CONFIG = load_db_config()

# PokeAPI base URL
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

def insert_character(cursor, character_data: Dict[str, Any], tier_id: int) -> bool:
    try:
        cursor.execute(
            "INSERT INTO public.characters (tier_id, name, status) VALUES (%s, %s, %s)",
            (tier_id, character_data['name'], Json(character_data['status']))
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
    
    if not DB_CONFIG.get('password') or DB_CONFIG['password'] == '[YOUR-PASSWORD]':
        print("\n⚠️  Please update the password in the .env file!")
        print("Replace [YOUR-PASSWORD] with your actual Supabase password.")
        return
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        tier_id = get_or_create_placeholder_tier(cursor)
        print(f"Using tier ID: {tier_id}")

        successful_inserts = 0
        
        for pokemon_id in range(1, 10):
            print(f"\nProcessing Pokemon #{pokemon_id}...")
            
            pokemon_data = fetch_pokemon_data(pokemon_id)
            if not pokemon_data:
                continue
            
            character_data = transform_pokemon_stats(pokemon_data)
            print(f"  Name: {character_data['name']}")
            print(f"  Stats: {character_data['status']}")
            
            if insert_character(cursor, character_data, tier_id):
                successful_inserts += 1
                print(f"  ✅ Successfully inserted {character_data['name']}")
            else:
                print(f"  ❌ Failed to insert {character_data['name']}")
        
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