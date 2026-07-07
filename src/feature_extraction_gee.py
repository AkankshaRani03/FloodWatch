"""
Google Earth Engine Feature Extraction Module
Fetches satellite-derived features for flood prediction
"""

import ee
from datetime import datetime, timedelta


def initialize_gee(project=None):
    """
    Initialize Google Earth Engine
    Must be authenticated first using: earthengine authenticate
    
    Args:
        project (str): GEE Cloud Project ID (e.g., 'ee-yourproject')
                      If None, will try default initialization
    """
    try:
        if project:
            ee.Initialize(project=project)
        else:
            # Try to initialize with default project
            ee.Initialize()
        print("✓ Google Earth Engine initialized successfully")
        return True
    except Exception as e:
        print(f"❌ GEE initialization failed: {e}")
        print("\nTo fix this:")
        print("1. Go to: https://code.earthengine.google.com")
        print("2. Check your project name in the top (e.g., 'flood-prediction-0325')")
        print("3. Initialize with: ee.Initialize(project='your-project-name')")
        return False


def extract_features_for_location(lat, lon, start_date, end_date, buffer_m=10000):
    """
    Extract all four features for a given location and time window
    
    Args:
        lat (float): Latitude
        lon (float): Longitude
        start_date (str): Start date in 'YYYY-MM-DD' format
        end_date (str): End date in 'YYYY-MM-DD' format
        buffer_m (int): Buffer radius in meters
        
    Returns:
        dict: Dictionary containing all features
    """
    # Define region
    point = ee.Geometry.Point([lon, lat])
    region = point.buffer(buffer_m)
    
    # 1. RAINFALL
    rainfall_collection = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY') \
        .filterDate(start_date, end_date) \
        .filterBounds(region)
    
    # Sum the precipitation over the time period
    rainfall = rainfall_collection.select('precipitation').sum()
    
    # Reduce to get the value
    rainfall_dict = rainfall.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=5566,
        maxPixels=1e9
    ).getInfo()
    
    # The band name after sum() is still 'precipitation'
    rainfall_value = rainfall_dict.get('precipitation', 0)
    
    # If no data, return None
    if rainfall_value is None:
        return None
    
    # 2. SOIL MOISTURE
    soil_moisture = ee.ImageCollection('ECMWF/ERA5_LAND/DAILY_AGGR') \
        .filterDate(start_date, end_date) \
        .filterBounds(region) \
        .select('volumetric_soil_water_layer_1') \
        .mean()
    
    soil_dict = soil_moisture.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=11132,
        maxPixels=1e9
    ).getInfo()
    
    soil_value = soil_dict.get('volumetric_soil_water_layer_1')
    if soil_value is None:
        return None
    
    # 3. ELEVATION
    elevation = ee.Image('USGS/SRTMGL1_003').select('elevation')
    elev_dict = elevation.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=30,
        maxPixels=1e9
    ).getInfo()
    
    elevation_value = elev_dict.get('elevation')
    if elevation_value is None:
        return None
    
    # 4. SLOPE
    slope = ee.Terrain.slope(elevation)
    slope_dict = slope.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=region,
        scale=30,
        maxPixels=1e9
    ).getInfo()
    
    slope_value = slope_dict.get('slope')
    if slope_value is None:
        return None
    
    features = {
        'rainfall_7d_mm': rainfall_value,
        'soil_moisture': soil_value,
        'elevation_m': elevation_value,
        'slope_deg': slope_value
    }
    
    return features


def get_safe_date_range(days_back=30, window_days=7):
    """
    Generate a safe historical date range
    (Avoids using 'today' due to satellite data latency)
    
    Args:
        days_back (int): How many days back from today
        window_days (int): Length of analysis window
        
    Returns:
        tuple: (start_date, end_date) as strings
    """
    end = datetime.now() - timedelta(days=days_back)
    start = end - timedelta(days=window_days)
    
    return start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d')


if __name__ == "__main__":
    # Test GEE connection with project
    project = 'flood-prediction-0325'  # Update if needed
    if initialize_gee(project=project):
        print("\n✓ GEE module ready for feature extraction")
    else:
        print("\n❌ GEE setup required")
