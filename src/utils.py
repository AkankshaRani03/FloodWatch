"""
Utility Functions
Helper functions for the flood prediction system
"""

import numpy as np
import pandas as pd


def classify_risk_level(probability):
    """
    Classify flood probability into risk levels
    
    Args:
        probability (float): Flood probability (0-1)
        
    Returns:
        str: Risk level
    """
    if probability >= 0.7:
        return "HIGH"
    elif probability >= 0.4:
        return "MEDIUM"
    else:
        return "LOW"


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
    response = {
        'flood_probability': round(probability, 4),
        'risk_level': classify_risk_level(probability),
        'confidence': 'high' if abs(probability - 0.5) > 0.3 else 'medium'
    }
    
    if features:
        response['features'] = features
    
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
