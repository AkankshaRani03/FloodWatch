"""
Mock Feature Extractor for Flood Predictions
Uses realistic data generation when GEE is unavailable
Perfect for testing predictions without GEE authentication

Features generated:
- rainfall_7d_mm: 0-500 mm (varies by location/season)
- soil_moisture: 0.0-1.0 (dimensionless)
- elevation_m: 0-5000 m
- slope_deg: 0-45 degrees
"""

import random
from datetime import datetime
from math import sin, cos, pi


def get_realistic_features(lat, lon):
    """
    Generate realistic features based on geographic location
    Uses latitude/longitude to create deterministic but varied features
    
    Args:
        lat (float): Latitude
        lon (float): Longitude
        
    Returns:
        dict: Dictionary with all required features
    """
    
    # Seed random with coordinates for consistency
    # (same location always gets similar features)
    random.seed(int(lat * 100) + int(lon * 100))
    
    # 1. RAINFALL (higher near equator, monsoon regions)
    # India monsoon: Jun-Sept high rainfall, rest low
    month = datetime.now().month
    base_rainfall = 50 + (50 * abs(sin((lat - 15) * pi / 180)))  # More rain near 15N
    
    if month in [6, 7, 8, 9]:  # Monsoon season
        rainfall = base_rainfall * random.uniform(2.0, 4.0)  # 100-400mm
    else:
        rainfall = base_rainfall * random.uniform(0.5, 1.5)  # 25-100mm
    
    rainfall = max(0, min(500, rainfall))  # Clamp 0-500
    
    # 2. SOIL MOISTURE (related to rainfall, elevation)
    # More moisture in monsoon, less in dry regions
    base_moisture = 0.3 + (0.3 * random.uniform(-1, 1))
    if month in [6, 7, 8, 9]:
        soil_moisture = min(0.95, base_moisture + 0.3)
    else:
        soil_moisture = max(0.1, base_moisture - 0.1)
    
    soil_moisture = max(0.0, min(1.0, soil_moisture))
    
    # 3. ELEVATION (varies by longitude in India)
    # Western Ghats: high (600-2000m)
    # Himalayas: very high (1500-5000m)
    # Plains: low (0-300m)
    if lon < 77:  # Western region (Ghats)
        elevation = 200 + random.uniform(400, 1800)
    elif lat > 30:  # Northern region (Himalayas)
        elevation = 500 + random.uniform(1000, 4000)
    else:  # Central/Eastern plains
        elevation = random.uniform(0, 500)
    
    elevation = max(0, min(5000, elevation))
    
    # 4. SLOPE (inversely related to elevation distribution)
    # High elevation = steeper slopes
    if elevation > 1000:
        slope = 10 + random.uniform(5, 25)  # Steep
    elif elevation > 300:
        slope = 3 + random.uniform(2, 10)  # Moderate
    else:
        slope = random.uniform(0, 5)  # Gentle
    
    slope = max(0, min(45, slope))
    
    return {
        'rainfall_7d_mm': round(rainfall, 2),
        'soil_moisture': round(soil_moisture, 4),
        'elevation_m': round(elevation, 1),
        'slope_deg': round(slope, 2)
    }


def extract_features_for_location_mock(lat, lon, start_date=None, end_date=None, buffer_m=10000):
    """
    Mock version of GEE feature extraction
    Compatible with the same interface as GEE extractor
    
    Args:
        lat (float): Latitude
        lon (float): Longitude
        start_date (str): Ignored (for compatibility)
        end_date (str): Ignored (for compatibility)
        buffer_m (int): Ignored (for compatibility)
        
    Returns:
        dict: Dictionary with features or None if invalid coords
    """
    
    # Validate coordinates
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        return None
    
    features = get_realistic_features(lat, lon)
    return features


if __name__ == "__main__":
    # Test with some Indian cities
    test_locations = [
        (17.3850, 78.4867, "Hyderabad"),
        (28.7041, 77.1025, "Delhi"),
        (13.0827, 80.2707, "Chennai"),
        (19.0760, 72.8777, "Mumbai"),
    ]
    
    print("Testing mock feature extraction:\n")
    for lat, lon, city in test_locations:
        features = extract_features_for_location_mock(lat, lon)
        print(f"{city} ({lat}, {lon}):")
        for key, value in features.items():
            print(f"  {key}: {value}")
        print()
