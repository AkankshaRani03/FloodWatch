"""
ArcGIS Export Module
Exports flood prediction results to formats compatible with ArcGIS
"""

import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from pathlib import Path
import json


def export_to_geojson(predictions_df, output_path):
    """
    Export predictions to GeoJSON format for ArcGIS
    
    Args:
        predictions_df (pd.DataFrame): DataFrame with lat, lon, predictions
        output_path (str): Output file path
    """
    # Create GeoDataFrame
    geometry = [Point(lon, lat) for lon, lat in zip(predictions_df['longitude'], predictions_df['latitude'])]
    
    gdf = gpd.GeoDataFrame(
        predictions_df,
        geometry=geometry,
        crs='EPSG:4326'  # WGS84
    )
    
    # Export to GeoJSON
    gdf.to_file(output_path, driver='GeoJSON')
    print(f"✓ Exported GeoJSON: {output_path}")
    
    return gdf


def export_to_csv(predictions_df, output_path):
    """
    Export predictions to CSV for ArcGIS (with XY coordinates)
    
    Args:
        predictions_df (pd.DataFrame): DataFrame with predictions
        output_path (str): Output file path
    """
    predictions_df.to_csv(output_path, index=False)
    print(f"✓ Exported CSV: {output_path}")


def export_to_shapefile(predictions_df, output_path):
    """
    Export predictions to Shapefile for ArcGIS Desktop
    
    Args:
        predictions_df (pd.DataFrame): DataFrame with predictions
        output_path (str): Output folder path (without extension)
    """
    # Create GeoDataFrame
    geometry = [Point(lon, lat) for lon, lat in zip(predictions_df['longitude'], predictions_df['latitude'])]
    
    gdf = gpd.GeoDataFrame(
        predictions_df,
        geometry=geometry,
        crs='EPSG:4326'
    )
    
    # Export to Shapefile
    gdf.to_file(output_path, driver='ESRI Shapefile')
    print(f"✓ Exported Shapefile: {output_path}")


def create_arcgis_layer_file(predictions_df, output_path):
    """
    Create ArcGIS-compatible layer definition JSON
    
    Args:
        predictions_df (pd.DataFrame): DataFrame with predictions
        output_path (str): Output JSON file path
    """
    layer_definition = {
        "name": "Flood Risk Predictions",
        "type": "Feature Layer",
        "geometryType": "esriGeometryPoint",
        "spatialReference": {
            "wkid": 4326
        },
        "fields": [
            {"name": "location", "type": "esriFieldTypeString", "alias": "Location"},
            {"name": "latitude", "type": "esriFieldTypeDouble", "alias": "Latitude"},
            {"name": "longitude", "type": "esriFieldTypeDouble", "alias": "Longitude"},
            {"name": "flood_prob", "type": "esriFieldTypeDouble", "alias": "Flood Probability"},
            {"name": "risk_level", "type": "esriFieldTypeString", "alias": "Risk Level"},
            {"name": "rainfall", "type": "esriFieldTypeDouble", "alias": "Rainfall (mm)"},
            {"name": "soil_moist", "type": "esriFieldTypeDouble", "alias": "Soil Moisture"},
            {"name": "elevation", "type": "esriFieldTypeDouble", "alias": "Elevation (m)"},
            {"name": "slope", "type": "esriFieldTypeDouble", "alias": "Slope (deg)"}
        ],
        "drawingInfo": {
            "renderer": {
                "type": "uniqueValue",
                "field1": "risk_level",
                "uniqueValueInfos": [
                    {
                        "value": "LOW",
                        "symbol": {
                            "type": "esriSMS",
                            "style": "esriSMSCircle",
                            "color": [74, 222, 128, 255],
                            "size": 8
                        },
                        "label": "Low Risk"
                    },
                    {
                        "value": "MEDIUM",
                        "symbol": {
                            "type": "esriSMS",
                            "style": "esriSMSCircle",
                            "color": [251, 191, 36, 255],
                            "size": 8
                        },
                        "label": "Medium Risk"
                    },
                    {
                        "value": "HIGH",
                        "symbol": {
                            "type": "esriSMS",
                            "style": "esriSMSCircle",
                            "color": [239, 68, 68, 255],
                            "size": 8
                        },
                        "label": "High Risk"
                    }
                ]
            }
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(layer_definition, f, indent=2)
    
    print(f"✓ Exported layer definition: {output_path}")


def export_all_formats(predictions_df, base_filename='flood_predictions'):
    """
    Export predictions to all ArcGIS-compatible formats
    
    Args:
        predictions_df (pd.DataFrame): DataFrame with predictions
        base_filename (str): Base name for output files
    """
    output_dir = Path(__file__).parent.parent / 'data' / 'outputs' / 'arcgis'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("\n" + "="*60)
    print("🗺️ EXPORTING FOR ArcGIS")
    print("="*60)
    
    # GeoJSON (ArcGIS Online, ArcGIS Pro)
    geojson_path = output_dir / f'{base_filename}.geojson'
    export_to_geojson(predictions_df, str(geojson_path))
    
    # CSV (ArcGIS Online, can add XY as points)
    csv_path = output_dir / f'{base_filename}.csv'
    export_to_csv(predictions_df, str(csv_path))
    
    # Shapefile (ArcGIS Desktop/Pro)
    shp_path = output_dir / f'{base_filename}.shp'
    export_to_shapefile(predictions_df, str(shp_path))
    
    # Layer definition JSON
    json_path = output_dir / f'{base_filename}_layer.json'
    create_arcgis_layer_file(predictions_df, str(json_path))
    
    print("\n" + "="*60)
    print("✅ EXPORT COMPLETE")
    print("="*60)
    print(f"\nFiles saved to: {output_dir}")
    print("\nArcGIS Import Options:")
    print("  1. ArcGIS Online: Upload .geojson or .csv")
    print("  2. ArcGIS Pro: Add .shp or .geojson")
    print("  3. ArcGIS Desktop: Add .shp")
    
    return output_dir


if __name__ == "__main__":
    # Test with sample data
    sample_data = pd.DataFrame({
        'location': ['Hyderabad', 'Mumbai', 'Chennai'],
        'latitude': [17.385, 19.076, 13.0827],
        'longitude': [78.4867, 72.8777, 80.2707],
        'flood_prob': [0.026, 0.977, 0.968],
        'risk_level': ['LOW', 'HIGH', 'HIGH'],
        'rainfall': [0.92, 0.01, 36.01],
        'soil_moist': [0.2049, 0.1152, 0.4041],
        'elevation': [523.64, 14.74, 6.40],
        'slope': [3.07, 3.15, 1.56]
    })
    
    export_all_formats(sample_data)
