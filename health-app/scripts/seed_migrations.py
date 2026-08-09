#!/usr/bin/env python3
"""
Parse Food_Database.csv and food_servings_final.csv to generate Supabase SQL migrations.
"""

import csv
import uuid
import re
from collections import defaultdict
from pathlib import Path

# Category mapping from CSV to app categories
CATEGORY_MAP = {
    'Snacks': 'snacks',
    'Beverages': 'beverages',
    'Desserts': 'desserts',
    'Fast Food': 'fast_food',
    'Nuts & Seeds': 'nuts_seeds',
    'Alcohol & Cocktails': 'alcohol',
    'Indian Bread': 'indian_bread',
    'Rice & Rice Dishes': 'rice_dishes',
    'Dal & Lentils': 'dal_lentils',
    'Vegetables': 'vegetables',
    'Fruits': 'fruits',
    'Dairy': 'dairy',
    'Breakfast Items': 'breakfast',
}

DATA_DIR = Path("C:/Health App")
FOOD_CSV = DATA_DIR / "Food_Database.csv"
SERVINGS_CSV = DATA_DIR / "food_servings_final.csv"
OUTPUT_DIR = Path(__file__).parent / "health-app" / "supabase" / "migrations"


def sanitize(text: str) -> str:
    """Escape single quotes for SQL."""
    return text.replace("'", "''")


def parse_foods():
    """Parse Food_Database.csv and return list of food dicts with generated UUIDs."""
    foods = []
    food_id_map = {}  # (name, category) -> uuid
    seen = set()
    
    with open(FOOD_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row['food_name'].strip()
            category = CATEGORY_MAP.get(row['category'].strip(), 'snacks')
            key = (name, category)
            
            # Skip exact duplicates
            if key in seen:
                continue
            seen.add(key)
            
            base_uom = row['base_uom'].strip()
            base_qty = float(row['base_quantity'])
            calories = float(row['calories'])
            protein = float(row['protein'])
            carbs = float(row['carbs'])
            fat = float(row['fat'])
            
            # Generate deterministic UUID based on name + category for reproducibility
            food_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{name}|{category}"))
            food_id_map[name] = food_uuid  # Keep last occurrence for servings matching
            
            # All values are per 100g or per 100ml (base_quantity)
            # Calculate per 100g/ml
            if base_uom == 'g':
                factor = 100.0 / base_qty
            else:  # ml
                factor = 100.0 / base_qty
            
            foods.append({
                'id': food_uuid,
                'name': name,
                'calories_per_100g': round(calories * factor, 2),
                'protein_per_100g': round(protein * factor, 2),
                'carbs_per_100g': round(carbs * factor, 2),
                'fat_per_100g': round(fat * factor, 2),
                'category': category,
                'is_active': True,
            })
    
    return foods, food_id_map


def parse_servings(food_id_map):
    """Parse food_servings_final.csv and return food_units and conversions."""
    food_units = []  # list of dicts
    conversions = []  # list of dicts
    
    # Build reverse map: food_name -> food_uuid (from our generated foods)
    name_to_uuid = {}
    for name, uuid_val in food_id_map.items():
        name_to_uuid[name] = uuid_val
    
    # Group servings by food_name
    servings_by_food = defaultdict(list)
    seen_servings = set()
    
    with open(SERVINGS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            food_name = row['food_name'].strip()
            serving_name = row['serving_name'].strip()
            equiv_qty = float(row['equivalent_quantity'])
            equiv_uom = row['equivalent_uom'].strip()
            
            # Match by food_name
            if food_name not in name_to_uuid:
                continue
            
            food_uuid = name_to_uuid[food_name]
            serving_key = (food_uuid, serving_name)
            
            # Skip duplicate servings for same food
            if serving_key in seen_servings:
                continue
            seen_servings.add(serving_key)
            
            servings_by_food[food_uuid].append({
                'name': serving_name,
                'grams': equiv_qty if equiv_uom == 'g' else equiv_qty,  # ml ≈ g
                'equiv_uom': equiv_uom,
            })
    
    # Create food_units with deterministic UUIDs
    unit_id_map = {}  # (food_id, serving_name) -> unit_id
    
    for food_id, servings in servings_by_food.items():
        for i, s in enumerate(servings):
            unit_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{food_id}:{s['name']}"))
            unit_id_map[(food_id, s['name'])] = unit_id
            
            is_default = (i == 0)
            food_units.append({
                'id': unit_id,
                'food_id': food_id,
                'name': s['name'],
                'grams_per_unit': round(s['grams'], 2),
                'is_default': is_default,
                'display_order': i,
            })
    
    # Create conversions: each unit -> base unit (100g)
    # Base unit is implicitly 100g, so conversion factor = grams_per_unit / 100
    for unit in food_units:
        if not unit['is_default']:  # Skip default unit (usually "Serving" or "100g")
            # Find the default unit for this food
            default_units = [u for u in food_units if u['food_id'] == unit['food_id'] and u['is_default']]
            if default_units:
                default_unit = default_units[0]
                # Conversion from this unit to default unit
                factor = round(unit['grams_per_unit'] / default_unit['grams_per_unit'], 4)
                if factor > 0:
                    conversions.append({
                        'id': str(uuid.uuid5(uuid.NAMESPACE_DNS, f"conv:{unit['food_id']}:{unit['id']}:{default_unit['id']}")),
                        'food_id': unit['food_id'],
                        'from_unit_id': unit['id'],
                        'to_unit_id': default_unit['id'],
                        'conversion_factor': factor,
                    })
    
    return food_units, conversions


def generate_foods_sql(foods):
    """Generate INSERT statements for foods table."""
    lines = [
        "-- Seed foods table",
        "INSERT INTO public.foods (id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_active) VALUES"
    ]
    
    value_lines = []
    for f in foods:
        value_lines.append(
            f"  ('{f['id']}', '{sanitize(f['name'])}', {f['calories_per_100g']}, "
            f"{f['protein_per_100g']}, {f['carbs_per_100g']}, {f['fat_per_100g']}, "
            f"'{f['category']}', {str(f['is_active']).lower()})"
        )
    
    lines.append(",\n".join(value_lines) + ";")
    return "\n".join(lines)


def generate_food_units_sql(food_units):
    """Generate INSERT statements for food_units table."""
    lines = [
        "-- Seed food_units table",
        "INSERT INTO public.food_units (id, food_id, name, grams_per_unit, is_default, display_order) VALUES"
    ]
    
    value_lines = []
    for u in food_units:
        value_lines.append(
            f"  ('{u['id']}', '{u['food_id']}', '{sanitize(u['name'])}', "
            f"{u['grams_per_unit']}, {str(u['is_default']).lower()}, {u['display_order']})"
        )
    
    lines.append(",\n".join(value_lines) + ";")
    return "\n".join(lines)


def generate_conversions_sql(conversions):
    """Generate INSERT statements for food_unit_conversions table."""
    if not conversions:
        return "-- No conversions to insert"
    
    lines = [
        "-- Seed food_unit_conversions table",
        "INSERT INTO public.food_unit_conversions (id, food_id, from_unit_id, to_unit_id, conversion_factor) VALUES"
    ]
    
    value_lines = []
    for c in conversions:
        value_lines.append(
            f"  ('{c['id']}', '{c['food_id']}', '{c['from_unit_id']}', "
            f"'{c['to_unit_id']}', {c['conversion_factor']})"
        )
    
    lines.append(",\n".join(value_lines) + ";")
    return "\n".join(lines)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("Parsing foods...")
    foods, food_id_map = parse_foods()
    print(f"  Parsed {len(foods)} foods")
    
    print("Parsing servings...")
    food_units, conversions = parse_servings(food_id_map)
    print(f"  Parsed {len(food_units)} food units")
    print(f"  Generated {len(conversions)} conversions")
    
    # Write migration files
    migrations = [
        ("20260809071725_seed_foods.sql", generate_foods_sql(foods)),
        ("20260809071726_seed_food_units.sql", generate_food_units_sql(food_units)),
        ("20260809071727_seed_food_conversions.sql", generate_conversions_sql(conversions)),
    ]
    
    for filename, content in migrations:
        filepath = OUTPUT_DIR / filename
        filepath.write_text(content, encoding='utf-8')
        print(f"  Written: {filepath}")
    
    print("\nDone!")


if __name__ == "__main__":
    main()