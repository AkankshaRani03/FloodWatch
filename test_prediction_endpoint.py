#!/usr/bin/env python3
"""
Test script for the /predict endpoint
Run this locally or on Render to diagnose prediction failures
"""

import requests
import json
import sys
from pathlib import Path

# Configuration
RENDER_URL = "https://floodwatch-lc04.onrender.com"
# Change to "http://localhost:5000" if testing locally
LOCAL_URL = "http://localhost:5000"

# Test coordinates (Hyderabad, India)
TEST_LAT = 17.3850
TEST_LON = 78.4867

# Test credentials
TEST_USERNAME = f"testuser_{int(__import__('time').time())}"
TEST_EMAIL = f"test_{int(__import__('time').time())}@test.com"
TEST_PASSWORD = "TestPassword123!"

class PredictionTester:
    def __init__(self, base_url=RENDER_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
        
    def log(self, message, level="INFO"):
        """Print and store log messages"""
        prefix = f"[{level}]"
        print(f"{prefix} {message}")
        self.results.append((level, message))
    
    def test_connectivity(self):
        """Test if server is reachable"""
        self.log("Testing connectivity to server...")
        try:
            response = self.session.get(f"{self.base_url}/")
            self.log(f"✓ Server responded with status {response.status_code}")
            return True
        except Exception as e:
            self.log(f"✗ Cannot reach server: {str(e)}", "ERROR")
            return False
    
    def test_registration(self):
        """Create a test account"""
        self.log(f"Creating test account: {TEST_USERNAME}...")
        try:
            response = self.session.post(
                f"{self.base_url}/register",
                json={
                    "username": TEST_USERNAME,
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                    "retype_password": TEST_PASSWORD,
                    "phone": "9999999999",
                    "role": "citizen"
                }
            )
            
            if response.status_code == 201:
                self.log(f"✓ Registration successful", "SUCCESS")
                return True
            else:
                data = response.json()
                error = data.get('errors', {}).get('general', 'Unknown error')
                self.log(f"✗ Registration failed: {error}", "ERROR")
                return False
        except Exception as e:
            self.log(f"✗ Registration error: {str(e)}", "ERROR")
            return False
    
    def test_login(self):
        """Log in with test account"""
        self.log(f"Logging in as {TEST_USERNAME}...")
        try:
            response = self.session.post(
                f"{self.base_url}/login",
                json={
                    "identifier": TEST_USERNAME,
                    "password": TEST_PASSWORD
                }
            )
            
            if response.status_code == 200:
                self.log(f"✓ Login successful", "SUCCESS")
                return True
            else:
                data = response.json()
                error = data.get('errors', {}).get('general', 'Unknown error')
                self.log(f"✗ Login failed: {error}", "ERROR")
                return False
        except Exception as e:
            self.log(f"✗ Login error: {str(e)}", "ERROR")
            return False
    
    def test_api_status(self):
        """Check API health"""
        self.log("Checking API status...")
        try:
            response = self.session.get(f"{self.base_url}/api/status")
            if response.status_code == 200:
                data = response.json()
                gee_status = data.get('gee_status', 'unknown')
                self.log(f"✓ API Status: {data.get('status')}, GEE: {gee_status}", "INFO")
                if gee_status == 'disconnected':
                    self.log("  ⚠️  GEE is DISCONNECTED - This will cause prediction failures!", "WARNING")
                return True
            else:
                self.log(f"✗ API status check failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"✗ API status error: {str(e)}", "ERROR")
            return False
    
    def test_prediction(self):
        """Test the /predict endpoint"""
        self.log(f"Testing prediction for coordinates: {TEST_LAT}, {TEST_LON}...")
        try:
            response = self.session.post(
                f"{self.base_url}/predict",
                json={
                    "latitude": TEST_LAT,
                    "longitude": TEST_LON
                },
                timeout=120  # 2 minute timeout for GEE queries
            )
            
            print(f"\n--- PREDICTION RESPONSE ---")
            print(f"HTTP Status: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            print(f"Body:\n{json.dumps(response.json(), indent=2)}")
            print(f"------------------------\n")
            
            if response.status_code == 200:
                data = response.json()
                probability = data.get('flood_probability', 'N/A')
                risk_level = data.get('risk_level', 'N/A')
                self.log(f"✓ Prediction successful!", "SUCCESS")
                self.log(f"  Flood Probability: {probability}")
                self.log(f"  Risk Level: {risk_level}")
                self.log(f"  Data Source: {data.get('data_source', 'N/A')}")
                return True
            
            elif response.status_code == 503:
                data = response.json()
                self.log(f"✗ Model not loaded: {data.get('message')}", "ERROR")
                self.log(f"  → The ML model file (random_forest_flood_model.pkl) is missing on the server", "ERROR")
                return False
            
            elif response.status_code == 500:
                data = response.json()
                error = data.get('error', 'Unknown error')
                if 'features' in error.lower():
                    self.log(f"✗ Feature extraction failed: {error}", "ERROR")
                    self.log(f"  → Likely GEE issue. Check that GOOGLE_APPLICATION_CREDENTIALS is set", "ERROR")
                else:
                    self.log(f"✗ Server error: {error}", "ERROR")
                return False
            
            elif response.status_code == 401:
                self.log(f"✗ Authentication failed (401 Unauthorized)", "ERROR")
                self.log(f"  → Session may have expired. Try logging in again", "ERROR")
                return False
            
            else:
                self.log(f"✗ Unexpected status code: {response.status_code}", "ERROR")
                self.log(f"  Response: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.Timeout:
            self.log(f"✗ Request timed out (>120s) - GEE queries too slow", "ERROR")
            self.log(f"  → Either GEE is slow or network is slow. Check Render logs", "ERROR")
            return False
        except Exception as e:
            self.log(f"✗ Prediction error: {str(e)}", "ERROR")
            return False
    
    def run_full_test(self):
        """Run complete test sequence"""
        print("\n" + "="*60)
        print("FLOOD PREDICTION ENDPOINT TEST")
        print("="*60 + "\n")
        
        self.log(f"Target URL: {self.base_url}")
        self.log(f"Test Location: Hyderabad ({TEST_LAT}, {TEST_LON})")
        
        print("\n--- STEP 1: Connectivity ---")
        if not self.test_connectivity():
            return False
        
        print("\n--- STEP 2: API Status ---")
        self.test_api_status()
        
        print("\n--- STEP 3: Registration ---")
        if not self.test_registration():
            self.log("Skipping remaining tests due to registration failure", "WARNING")
            return False
        
        print("\n--- STEP 4: Login ---")
        if not self.test_login():
            self.log("Skipping remaining tests due to login failure", "WARNING")
            return False
        
        print("\n--- STEP 5: Prediction ---")
        prediction_ok = self.test_prediction()
        
        print("\n" + "="*60)
        if prediction_ok:
            print("✓ ALL TESTS PASSED - Predictions are working!")
        else:
            print("✗ TESTS FAILED - See error messages above")
        print("="*60 + "\n")
        
        return prediction_ok


def main():
    # Allow passing URL as command line argument
    url = sys.argv[1] if len(sys.argv) > 1 else RENDER_URL
    
    if "--local" in sys.argv:
        url = LOCAL_URL
    
    tester = PredictionTester(base_url=url)
    success = tester.run_full_test()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
