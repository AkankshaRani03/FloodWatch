"""
Flask API Test Script
Tests the flood prediction API endpoints
"""

import requests
import json


BASE_URL = 'http://localhost:5000'


def test_health_check():
    """Test the health check endpoint"""
    print("\n" + "="*60)
    print("🏥 TESTING HEALTH CHECK")
    print("="*60)
    
    try:
        response = requests.get(f'{BASE_URL}/')
        
        if response.status_code == 200:
            data = response.json()
            print("\n✅ API is online!")
            print(f"  Status: {data.get('status')}")
            print(f"  Service: {data.get('service')}")
            print(f"  GEE Status: {data.get('gee_status')}")
            return True
        else:
            print(f"\n❌ Health check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"\n❌ Cannot connect to API: {e}")
        print("\nMake sure Flask server is running:")
        print("  python api/flask_app.py")
        return False


def test_prediction(lat, lon, location_name):
    """Test prediction for a location"""
    print(f"\n--- Testing: {location_name} ---")
    print(f"Coordinates: ({lat}, {lon})")
    
    payload = {
        "latitude": lat,
        "longitude": lon
    }
    
    try:
        response = requests.post(
            f'{BASE_URL}/predict',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"\n✅ Prediction successful!")
            print(f"  Flood Probability: {data['flood_probability']:.4f} ({data['flood_probability']*100:.2f}%)")
            print(f"  Risk Level:        {data['risk_level']}")
            print(f"  Confidence:        {data['confidence']}")
            
            if 'features' in data:
                print(f"\n  Features Used:")
                print(f"    Rainfall:      {data['features']['rainfall_7d_mm']:.2f} mm")
                print(f"    Soil Moisture: {data['features']['soil_moisture']:.4f} m³/m³")
                print(f"    Elevation:     {data['features']['elevation_m']:.2f} m")
                print(f"    Slope:         {data['features']['slope_deg']:.2f}°")
            
            if 'date_range' in data:
                print(f"\n  Date Range: {data['date_range']['start']} to {data['date_range']['end']}")
            
            return True
        else:
            print(f"\n❌ Prediction failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ Request failed: {e}")
        return False


def test_invalid_coordinates():
    """Test with invalid coordinates"""
    print("\n" + "="*60)
    print("🧪 TESTING ERROR HANDLING")
    print("="*60)
    
    print("\n--- Testing: Invalid Coordinates ---")
    
    payload = {
        "latitude": 200,  # Invalid
        "longitude": 300   # Invalid
    }
    
    try:
        response = requests.post(
            f'{BASE_URL}/predict',
            json=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 400:
            print("✅ Correctly rejected invalid coordinates")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False


def main():
    """Run all API tests"""
    print("\n" + "="*60)
    print("🌊 FLOOD PREDICTION API - TEST SUITE")
    print("="*60)
    
    # Test 1: Health Check
    health_ok = test_health_check()
    
    if not health_ok:
        print("\n❌ API is not running. Exiting tests.")
        return
    
    # Test 2: Multiple Predictions
    print("\n" + "="*60)
    print("🎯 TESTING PREDICTIONS")
    print("="*60)
    
    test_locations = [
        {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
        {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
        {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
        {"name": "Delhi", "lat": 28.7041, "lon": 77.1025}
    ]
    
    results = []
    for loc in test_locations:
        success = test_prediction(loc['lat'], loc['lon'], loc['name'])
        results.append(success)
    
    # Test 3: Error Handling
    error_handling_ok = test_invalid_coordinates()
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print(f"  Health Check:     {'✅' if health_ok else '❌'}")
    print(f"  Predictions:      {sum(results)}/{len(results)} passed")
    print(f"  Error Handling:   {'✅' if error_handling_ok else '❌'}")
    
    if health_ok and all(results) and error_handling_ok:
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\n🚀 Flask API is working perfectly!")
        print("\nYou can now:")
        print("  1. Test manually: http://localhost:5000")
        print("  2. Make predictions via POST /predict")
        print("  3. Integrate with frontend or ArcGIS")
    else:
        print("\n⚠️ Some tests failed. Check the API logs.")


if __name__ == "__main__":
    main()
