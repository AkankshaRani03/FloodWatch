"""
Batch Prediction Generator for ArcGIS Mapping
Generates systematic grid predictions across specified region
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from src.feature_extraction_gee import initialize_gee, extract_features_for_location
from src.arcgis_export import export_all_formats
from configs.config import MODEL_PATH, GEE_PROJECT
import joblib
from tqdm import tqdm
import time


def generate_grid_locations(min_lat, max_lat, min_lon, max_lon, grid_spacing=0.1):
    """
    Generate grid of locations for prediction
    
    Args:
        min_lat, max_lat: Latitude bounds
        min_lon, max_lon: Longitude bounds
        grid_spacing: Grid spacing in degrees (0.1° ≈ 11km)
    
    Returns:
        List of (lat, lon) tuples
    """
    lats = np.arange(min_lat, max_lat, grid_spacing)
    lons = np.arange(min_lon, max_lon, grid_spacing)
    
    grid = [(lat, lon) for lat in lats for lon in lons]
    print(f"📍 Generated {len(grid)} grid points")
    return grid


def predict_grid_batch(grid_locations, model, region_name='India'):
    """
    Generate predictions for all grid locations
    
    Args:
        grid_locations: List of (lat, lon) tuples
        model: Trained ML model
        region_name: Name for the region
    
    Returns:
        DataFrame with predictions
    """
    results = []
    
    # Calculate date window (7 days ending 30 days ago to ensure data availability)
    end_date = datetime.now() - timedelta(days=30)
    start_date = end_date - timedelta(days=7)
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    
    print(f"\n🔄 Processing {len(grid_locations)} locations...")
    print(f"📅 Data window: {start_str} to {end_str}")
    
    for i, (lat, lon) in enumerate(tqdm(grid_locations)):
        try:
            # Extract features from GEE
            features = extract_features_for_location(lat, lon, start_str, end_str)
            
            if features is None:
                continue
            
            # Prepare features for prediction
            feature_array = np.array([[
                features['rainfall_7d_mm'],
                features['soil_moisture'],
                features['elevation_m'],
                features['slope_deg']
            ]])
            
            # Predict
            prediction = model.predict(feature_array)[0]
            probability = model.predict_proba(feature_array)[0][1]
            
            # Determine risk level
            if probability < 0.3:
                risk = 'LOW'
            elif probability < 0.7:
                risk = 'MEDIUM'
            else:
                risk = 'HIGH'
            
            results.append({
                'location': f'Grid_{i+1}',
                'latitude': lat,
                'longitude': lon,
                'flood_prob': round(probability, 3),
                'risk_level': risk,
                'rainfall': round(features['rainfall_7d_mm'], 2),
                'soil_moist': round(features['soil_moisture'], 4),
                'elevation': round(features['elevation_m'], 2),
                'slope': round(features['slope_deg'], 2)
            })
            
            # Rate limiting to avoid GEE quota issues
            if (i + 1) % 50 == 0:
                time.sleep(2)
        
        except Exception as e:
            print(f"⚠️ Error at ({lat:.2f}, {lon:.2f}): {e}")
            continue
    
    df = pd.DataFrame(results)
    print(f"\n✅ Successfully processed {len(df)} locations")
    
    return df


def generate_predictions_for_region(region_config):
    """
    Generate predictions for predefined region
    
    Args:
        region_config (dict): Configuration with bounds and name
    """
    print("\n" + "="*60)
    print(f"🌍 FLOOD RISK ASSESSMENT: {region_config['name']}")
    print("="*60)
    
    # Initialize GEE
    initialize_gee(GEE_PROJECT)
    
    # Load model
    model = joblib.load(MODEL_PATH)
    print(f"✓ Loaded model from {MODEL_PATH}")
    
    # Generate grid
    grid = generate_grid_locations(
        region_config['min_lat'],
        region_config['max_lat'],
        region_config['min_lon'],
        region_config['max_lon'],
        region_config.get('grid_spacing', 0.1)
    )
    
    # Generate predictions
    predictions_df = predict_grid_batch(grid, model, region_config['name'])
    
    # Export to ArcGIS formats
    if len(predictions_df) > 0:
        output_dir = export_all_formats(predictions_df, f"flood_risk_{region_config['name'].lower().replace(' ', '_')}")
        
        # Print statistics
        print("\n" + "="*60)
        print("📊 RISK STATISTICS")
        print("="*60)
        risk_counts = predictions_df['risk_level'].value_counts()
        total = len(predictions_df)
        
        for risk in ['HIGH', 'MEDIUM', 'LOW']:
            count = risk_counts.get(risk, 0)
            pct = (count / total * 100) if total > 0 else 0
            print(f"{risk:8s}: {count:4d} ({pct:5.1f}%)")
        
        print(f"\nTotal locations: {total}")
        print(f"Avg flood probability: {predictions_df['flood_prob'].mean():.2%}")
    
    return predictions_df


# Predefined regions
REGIONS = {
    'telangana': {
        'name': 'Telangana',
        'min_lat': 15.8,
        'max_lat': 19.9,
        'min_lon': 77.2,
        'max_lon': 81.3,
        'grid_spacing': 0.2  # ~22km
    },
    'maharashtra': {
        'name': 'Maharashtra',
        'min_lat': 15.6,
        'max_lat': 22.0,
        'min_lon': 72.6,
        'max_lon': 80.9,
        'grid_spacing': 0.2
    },
    'tamil_nadu': {
        'name': 'Tamil Nadu',
        'min_lat': 8.1,
        'max_lat': 13.5,
        'min_lon': 76.2,
        'max_lon': 80.3,
        'grid_spacing': 0.2
    },
    'india_major_cities': {
        'name': 'India_Major_Cities',
        'cities': [
            ('Mumbai', 19.076, 72.8777),
            ('Delhi', 28.7041, 77.1025),
            ('Bangalore', 12.9716, 77.5946),
            ('Hyderabad', 17.385, 78.4867),
            ('Chennai', 13.0827, 80.2707),
            ('Kolkata', 22.5726, 88.3639),
            ('Pune', 18.5204, 73.8567),
            ('Ahmedabad', 23.0225, 72.5714),
            ('Jaipur', 26.9124, 75.7873),
            ('Lucknow', 26.8467, 80.9462)
        ]
    }
}


def generate_predictions_for_cities(cities_list):
    """
    Generate predictions for specific cities
    
    Args:
        cities_list: List of (name, lat, lon) tuples
    """
    print("\n" + "="*60)
    print("🏙️ FLOOD RISK ASSESSMENT: Major Cities")
    print("="*60)
    
    # Initialize GEE
    initialize_gee(GEE_PROJECT)
    
    # Load model
    model = joblib.load(MODEL_PATH)
    print(f"✓ Loaded model from {MODEL_PATH}")
    
    # Calculate date window
    end_date = datetime.now() - timedelta(days=30)
    start_date = end_date - timedelta(days=7)
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    
    print(f"📅 Data window: {start_str} to {end_str}")
    
    results = []
    
    for name, lat, lon in tqdm(cities_list):
        try:
            features = extract_features_for_location(lat, lon, start_str, end_str)
            
            if features is None:
                continue
            
            feature_array = np.array([[
                features['rainfall_7d_mm'],
                features['soil_moisture'],
                features['elevation_m'],
                features['slope_deg']
            ]])
            
            prediction = model.predict(feature_array)[0]
            probability = model.predict_proba(feature_array)[0][1]
            
            if probability < 0.3:
                risk = 'LOW'
            elif probability < 0.7:
                risk = 'MEDIUM'
            else:
                risk = 'HIGH'
            
            results.append({
                'location': name,
                'latitude': lat,
                'longitude': lon,
                'flood_prob': round(probability, 3),
                'risk_level': risk,
                'rainfall': round(features['rainfall_7d_mm'], 2),
                'soil_moist': round(features['soil_moisture'], 4),
                'elevation': round(features['elevation_m'], 2),
                'slope': round(features['slope_deg'], 2)
            })
        
        except Exception as e:
            print(f"⚠️ Error for {name}: {e}")
            continue
    
    df = pd.DataFrame(results)
    
    if len(df) > 0:
        export_all_formats(df, 'flood_risk_india_major_cities')
    
    return df


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate flood predictions for ArcGIS')
    parser.add_argument('--region', type=str, choices=list(REGIONS.keys()),
                        help='Predefined region to process')
    parser.add_argument('--all', action='store_true',
                        help='Process all predefined regions')
    
    args = parser.parse_args()
    
    if args.all:
        # Process all regions
        for region_key in ['india_major_cities', 'telangana']:
            if region_key == 'india_major_cities':
                generate_predictions_for_cities(REGIONS[region_key]['cities'])
            else:
                generate_predictions_for_region(REGIONS[region_key])
            
            print("\n" + "="*60 + "\n")
    
    elif args.region:
        # Process specific region
        if args.region == 'india_major_cities':
            generate_predictions_for_cities(REGIONS[args.region]['cities'])
        else:
            generate_predictions_for_region(REGIONS[args.region])
    
    else:
        # Default: Major cities
        print("No region specified. Running for major cities...")
        generate_predictions_for_cities(REGIONS['india_major_cities']['cities'])
