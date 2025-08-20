import requests
import psycopg2
import json
import time
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv


def load_db_config() -> Dict[str, str]:
    
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    if not os.path.exists(env_path):
        raise FileNotFoundError(f".env file not found at {env_path}")
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    config_start = content.find('DB_CONFIG={')
    if config_start == -1:
        raise ValueError("DB_CONFIG not found in .env file")

    json_start = content.find('{', config_start)
    json_end = content.find('}', json_start) + 1
    config_json = content[json_start:json_end]
    
    try:
        config = json.loads(config_json)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in DB_CONFIG: {e}")
    
    db_config = {
        'host': config.get('host'),
        'database': config.get('dbname'),
        'user': config.get('user'),
        'password': config.get('password'),
        'port': config.get('port')
    }
    
    required_fields = ['user', 'password', 'host', 'port', 'database']
    for field in required_fields:
        if field not in db_config or db_config[field] is None:
            raise ValueError(f"Missing required database config field: {field}")
    
    if db_config['password'] == '[YOUR-PASSWORD]':
        print("⚠️  Warning: Please update the password in your .env file!")
        print("   The password is currently set to '[YOUR-PASSWORD]'")
        print("   Update it with your actual Supabase password.")
        return None
    
    return db_config


def fetch_move_data(move_id: int) -> Optional[Dict[str, Any]]:

    try:
        url = f"https://pokeapi.co/api/v2/move/{move_id}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            print(f"Move {move_id} not found (404)")
            return None
        else:
            print(f"Failed to fetch move {move_id}: HTTP {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Network error fetching move {move_id}: {e}")
        return None


def extract_move_info(move_data: Dict[str, Any]) -> Dict[str, Any]:

    move_info = {
        'power': move_data.get('power'),  
        'accuracy': move_data.get('accuracy'),
        'effect_chance': move_data.get('effect_chance'),
        'type': move_data.get('type', {}).get('name') if move_data.get('type') else None
    }
    
    effect_entries = move_data.get('effect_entries', [])
    english_effect = None
    for entry in effect_entries:
        if entry.get('language', {}).get('name') == 'en':
            english_effect = entry.get('effect')
            break
    
    if english_effect:
        move_info['effect'] = english_effect
    else:
        move_info['effect'] = None
    
    return move_info


def insert_move(cursor, move_name: str, move_info: Dict[str, Any]) -> bool:

    try:

        cursor.execute(
            "SELECT id FROM moves WHERE move_name = %s",
            (move_name,)
        )
        
        if cursor.fetchone():
            print(f"Move '{move_name}' already exists, skipping...")
            return True
        
        cursor.execute(
            """
            INSERT INTO moves (move_name, move_info)
            VALUES (%s, %s)
            """,
            (move_name, json.dumps(move_info))
        )
        
        print(f"✅ Inserted move: {move_name}")
        print(f"   Power: {move_info.get('power', 'N/A')}")
        print(f"   Type: {move_info.get('type', 'N/A')}")
        print(f"   Accuracy: {move_info.get('accuracy', 'N/A')}")
        print(f"   Effect Chance: {move_info.get('effect_chance', 'N/A')}")
        return True
        
    except Exception as e:
        print(f"❌ Error inserting move '{move_name}': {e}")
        return False


def main():
    print("🎮 Pokemon Moves Data Population Script")
    print("=======================================")
    print("Extracting: move name, damage (power), type, effect, effect chance, accuracy")
    
    try:
        db_config = load_db_config()
        if db_config is None:
            return
    except Exception as e:
        print(f"❌ Error loading database config: {e}")
        return
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        print("✅ Connected to database successfully")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return
    
    try:
        print("\n🔄 Fetching moves from PokeAPI...")
        
        successful_inserts = 0
        failed_inserts = 0
        
        for move_id in range(1, 31):
            print(f"\nProcessing move {move_id}/30...")
            
            move_data = fetch_move_data(move_id)
            if not move_data:
                failed_inserts += 1
                continue
            
            move_name = move_data.get('name', '').replace('-', ' ').title()

            move_info = extract_move_info(move_data)
            
            if insert_move(cursor, move_name, move_info):
                successful_inserts += 1
                conn.commit()
            else:
                failed_inserts += 1
                conn.rollback()
            
            time.sleep(0.1)
        
        print(f"\n📊 Summary:")
        print(f"   ✅ Successfully inserted: {successful_inserts} moves")
        print(f"   ❌ Failed insertions: {failed_inserts} moves")
        print(f"   🎯 Total processed: {successful_inserts + failed_inserts} moves")
        
        print(f"\n📋 Sample moves in database:")
        cursor.execute(
            "SELECT move_name, move_info->>'power' as power, move_info->>'type' as type FROM moves LIMIT 5"
        )
        for row in cursor.fetchall():
            move_name, power, move_type = row
            print(f"   • {move_name}: {power} power, {move_type} type")
        
    except KeyboardInterrupt:
        print("\n⚠️  Operation cancelled by user")
        conn.rollback()
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()
        print("\n🔌 Database connection closed")


if __name__ == "__main__":
    main()