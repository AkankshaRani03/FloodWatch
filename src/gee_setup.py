"""
Google Earth Engine Setup Helper
Handles service account authentication for Render deployment
"""

import os
import json
import base64
from pathlib import Path


def setup_gee_credentials_from_env():
    """
    Set up GEE credentials from environment variables.
    
    Two methods supported:
    1. Direct JSON (for small service accounts):
       GOOGLE_APPLICATION_CREDENTIALS_JSON = <json-content>
    
    2. Base64 encoded JSON (for pasting into UI):
       GOOGLE_APPLICATION_CREDENTIALS_B64 = <base64-encoded-json>
    
    Returns:
        str: Path to credentials file if successful, None otherwise
    """
    
    creds_dir = Path(__file__).parent.parent / 'config' / 'gee'
    creds_dir.mkdir(parents=True, exist_ok=True)
    creds_file = creds_dir / 'service-account.json'
    
    # Method 1: Direct JSON from environment
    if 'GOOGLE_APPLICATION_CREDENTIALS_JSON' in os.environ:
        try:
            creds_json = os.environ['GOOGLE_APPLICATION_CREDENTIALS_JSON']
            creds_data = json.loads(creds_json)
            
            with open(creds_file, 'w') as f:
                json.dump(creds_data, f)
            
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(creds_file)
            print(f"✓ GEE credentials loaded from GOOGLE_APPLICATION_CREDENTIALS_JSON")
            return str(creds_file)
        except Exception as e:
            print(f"❌ Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON: {e}")
    
    # Method 2: Base64 encoded JSON
    if 'GOOGLE_APPLICATION_CREDENTIALS_B64' in os.environ:
        try:
            creds_b64 = os.environ['GOOGLE_APPLICATION_CREDENTIALS_B64']
            creds_json = base64.b64decode(creds_b64).decode('utf-8')
            creds_data = json.loads(creds_json)
            
            with open(creds_file, 'w') as f:
                json.dump(creds_data, f)
            
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(creds_file)
            print(f"✓ GEE credentials loaded from GOOGLE_APPLICATION_CREDENTIALS_B64")
            return str(creds_file)
        except Exception as e:
            print(f"❌ Failed to decode/parse GOOGLE_APPLICATION_CREDENTIALS_B64: {e}")
    
    # Method 3: Check if file already exists
    if creds_file.exists():
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = str(creds_file)
        print(f"✓ Using existing credentials file: {creds_file}")
        return str(creds_file)
    
    return None


if __name__ == '__main__':
    # For local testing
    print("Testing GEE credentials setup...")
    result = setup_gee_credentials_from_env()
    if result:
        print(f"Credentials available at: {result}")
    else:
        print("No credentials found. Please set environment variables.")
