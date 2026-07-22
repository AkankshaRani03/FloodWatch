"""
Utility Functions
Helper functions for the flood prediction system
"""

import os


RISK_THRESHOLDS = {
    'HIGH': float(os.environ.get('RISK_THRESHOLD_HIGH', 0.70)),
    'MEDIUM': float(os.environ.get('RISK_THRESHOLD_MEDIUM', 0.40)),
    'LOW': 0.0
}


def classify_risk_level(probability):
    """
    Classify flood probability into risk levels
    
    Args:
        probability (float): Flood probability (0-1)
        
    Returns:
        str: Risk level
    """
    if probability >= RISK_THRESHOLDS['HIGH']:
        return "HIGH"
    elif probability >= RISK_THRESHOLDS['MEDIUM']:
        return "MEDIUM"
    else:
        return "LOW"


def normalize_feature_payload(features):
    """Return rounded feature values and flat aliases for dashboard use."""
    if not features:
        return {}, {}

    normalized = {
        'rainfall_7d_mm': round(float(features.get('rainfall_7d_mm', 0)), 2),
        'soil_moisture': round(float(features.get('soil_moisture', 0)), 4),
        'elevation_m': round(float(features.get('elevation_m', 0)), 2),
        'slope_deg': round(float(features.get('slope_deg', 0)), 2)
    }

    aliases = {
        'rainfall': normalized['rainfall_7d_mm'],
        'soil_moisture': normalized['soil_moisture'],
        'elevation': normalized['elevation_m'],
        'slope': normalized['slope_deg']
    }

    return normalized, aliases


def validate_coordinates(lat, lon):
    """
    Validate latitude and longitude
    
    Args:
        lat (float): Latitude
        lon (float): Longitude
        
    Returns:
        bool: True if valid
    """
    if not (-90 <= lat <= 90):
        return False
    if not (-180 <= lon <= 180):
        return False
    return True


def format_prediction_response(probability, features=None):
    """
    Format prediction response for API
    
    Args:
        probability (float): Flood probability
        features (dict): Optional feature values
        
    Returns:
        dict: Formatted response
    """
    probability = float(probability)
    probability_percent = probability * 100
    risk_level = classify_risk_level(probability)

    response = {
        'flood_probability': round(probability, 4),
        'flood_probability_percent': round(probability_percent, 1),
        'risk_level': risk_level,
        'confidence': 'high' if abs(probability - 0.5) > 0.3 else 'medium',
        'thresholds': {
            'high': RISK_THRESHOLDS['HIGH'],
            'medium': RISK_THRESHOLDS['MEDIUM'],
            'high_percent': int(RISK_THRESHOLDS['HIGH'] * 100),
            'medium_percent': int(RISK_THRESHOLDS['MEDIUM'] * 100)
        }
    }
    
    if features:
        normalized_features, aliases = normalize_feature_payload(features)
        response['features'] = normalized_features
        response.update(aliases)
    
    return response


def print_banner(text):
    """
    Print a formatted banner
    
    Args:
        text (str): Text to display
    """
    width = len(text) + 4
    print("\n" + "=" * width)
    print(f"  {text}  ")
    print("=" * width)


if __name__ == "__main__":
    # Test utilities
    print(classify_risk_level(0.85))  # HIGH
    print(classify_risk_level(0.55))  # MEDIUM
    print(classify_risk_level(0.25))  # LOW
    print(validate_coordinates(17.385, 78.486))  # True
    print(validate_coordinates(100, 200))  # False
