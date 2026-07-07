# 🐍 Code Usage Guide

## Overview

This guide explains how to use the Python scripts to generate new ArcGIS-compatible flood predictions.

---

## Prerequisites

### 1. Software Requirements
- **Python:** 3.8 or higher
- **pip:** Latest version
- **Git:** (optional, for cloning)

### 2. Python Packages

Create a `requirements.txt` file:

```txt
geopandas>=0.14.0
pandas>=2.0.0
numpy>=1.24.0
shapely>=2.0.0
earthengine-api>=0.1.350
joblib>=1.3.0
tqdm>=4.65.0
scikit-learn>=1.3.0
```

Install packages:
```bash
pip install -r requirements.txt
```

### 3. Google Earth Engine Setup

**Step A: Create GEE Account**
1. Visit: https://earthengine.google.com/
2. Sign up with Google account
3. Request access (usually instant for education/research)

**Step B: Create GEE Project**
1. Go to: https://console.cloud.google.com/
2. Create new project (e.g., "flood-prediction")
3. Note the Project ID

**Step C: Authenticate**
```bash
earthengine authenticate
```
Follow browser prompts to authenticate.

### 4. Required Files (Not Included)

You need these from the main flood prediction system:

- **Trained Model:** `models/flood_model_optimized.pkl`
- **Config File:** `configs/config.py` with:
  ```python
  # Google Earth Engine Configuration
  GEE_PROJECT = 'your-gee-project-id'
  
  # Model path
  MODEL_PATH = 'models/flood_model_optimized.pkl'
  ```
- **Feature Extraction:** `src/feature_extraction_gee.py`
- **Utils:** `src/utils.py` (if referenced)

---

## File Structure Setup

Organize files like this:

```
your_project/
│
├── configs/
│   └── config.py                       # Configuration
│
├── models/
│   └── flood_model_optimized.pkl       # Trained ML model
│
├── src/
│   ├── arcgis_export.py                # From this package
│   ├── generate_arcgis_predictions.py  # From this package
│   └── feature_extraction_gee.py       # From main system
│
└── data/
    └── outputs/
        └── arcgis/                     # Output folder (auto-created)
```

---

## Usage

### 1. Test Export Functionality

Test if export modules work:

```bash
cd src
python arcgis_export.py
```

**Expected Output:**
```
============================================================
🗺️ EXPORTING FOR ArcGIS
============================================================
✓ Exported GeoJSON: ../data/outputs/arcgis/flood_predictions.geojson
✓ Exported CSV: ../data/outputs/arcgis/flood_predictions.csv
✓ Exported Shapefile: ../data/outputs/arcgis/flood_predictions.shp
✓ Exported layer definition: ../data/outputs/arcgis/flood_predictions_layer.json

============================================================
✅ EXPORT COMPLETE
============================================================
```

### 2. Generate Predictions for Major Cities

**Command:**
```bash
python generate_arcgis_predictions.py
```

**What it does:**
- Processes 10 major Indian cities (Mumbai, Delhi, Bangalore, etc.)
- Extracts features from Google Earth Engine
- Runs ML predictions
- Exports all formats

**Expected Output:**
```
============================================================
🏙️ FLOOD RISK ASSESSMENT: Major Cities
============================================================
✓ Loaded model from models/flood_model_optimized.pkl
📅 Data window: 2026-01-15 to 2026-01-22

Processing: 100%|████████████████| 10/10 [00:45<00:00, 4.5s/it]

✅ Successfully processed 10 locations

============================================================
🗺️ EXPORTING FOR ArcGIS
============================================================
✓ Exported GeoJSON: ../data/outputs/arcgis/flood_risk_india_major_cities.geojson
✓ Exported CSV: ../data/outputs/arcgis/flood_risk_india_major_cities.csv
✓ Exported Shapefile: ../data/outputs/arcgis/flood_risk_india_major_cities.shp
✓ Exported layer definition: ../data/outputs/arcgis/flood_risk_india_major_cities_layer.json

============================================================
📊 RISK STATISTICS
============================================================
HIGH    :    3 ( 30.0%)
MEDIUM  :    2 ( 20.0%)
LOW     :    5 ( 50.0%)

Total locations: 10
Avg flood probability: 45.23%
```

### 3. Generate Predictions for Specific Region

**Available Regions:**
- `telangana` - Telangana state
- `maharashtra` - Maharashtra state
- `tamil_nadu` - Tamil Nadu state
- `india_major_cities` - 10 major cities

**Command:**
```bash
python generate_arcgis_predictions.py --region telangana
```

**What it does:**
- Creates grid of points across the state (~1000 points for 0.2° spacing)
- May take 20-60 minutes depending on grid density
- Processes in batches to avoid GEE quota limits

**Example Output:**
```
============================================================
🌍 FLOOD RISK ASSESSMENT: Telangana
============================================================
✓ Loaded model from models/flood_model_optimized.pkl
📍 Generated 1024 grid points
📅 Data window: 2026-01-15 to 2026-01-22

🔄 Processing 1024 locations...
Processing: 100%|████████████████| 1024/1024 [28:32<00:00, 1.67s/it]

✅ Successfully processed 1021 locations
```

### 4. Generate All Regions

**Command:**
```bash
python generate_arcgis_predictions.py --all
```

**What it does:**
- Processes major cities + Telangana
- Takes 30-90 minutes total
- Creates multiple output files

---

## Customization

### Custom Region

Edit `generate_arcgis_predictions.py`:

```python
# Add at the end of REGIONS dictionary
REGIONS = {
    # ... existing regions ...
    
    'my_custom_region': {
        'name': 'My Custom Region',
        'min_lat': 10.0,    # South boundary
        'max_lat': 15.0,    # North boundary
        'min_lon': 75.0,    # West boundary
        'max_lon': 80.0,    # East boundary
        'grid_spacing': 0.1 # ~11 km spacing
        # Lower = more points, longer processing
        # 0.05 = ~5.5 km (detailed)
        # 0.1 = ~11 km (balanced)
        # 0.2 = ~22 km (broader)
    }
}
```

Run:
```bash
python generate_arcgis_predictions.py --region my_custom_region
```

### Custom Cities List

Edit `generate_arcgis_predictions.py`:

```python
# Add after REGIONS definition
MY_CITIES = [
    ('City1', lat1, lon1),
    ('City2', lat2, lon2),
    # ... more cities
]

# Then call:
generate_predictions_for_cities(MY_CITIES)
```

Or create a CSV file with cities and modify the script to read from it.

### Change Date Window

Edit `generate_arcgis_predictions.py`, line ~48:

```python
# Default: 30 days ago to avoid data latency
end_date = datetime.now() - timedelta(days=30)
start_date = end_date - timedelta(days=7)  # 7-day window

# Custom: Use specific dates
start_date = datetime(2026, 1, 1)
end_date = datetime(2026, 1, 7)
```

### Change Export Folder

Edit `arcgis_export.py`, line ~164:

```python
# Default
output_dir = Path(__file__).parent.parent / 'data' / 'outputs' / 'arcgis'

# Custom
output_dir = Path('C:/My_ArcGIS_Exports/')
```

---

## Troubleshooting

### Error: "Earth Engine not initialized"

**Solution:**
```bash
earthengine authenticate
```

Then in Python:
```python
import ee
ee.Authenticate()
ee.Initialize(project='your-project-id')
```

### Error: "Model file not found"

**Solution:**
- Ensure `models/flood_model_optimized.pkl` exists
- Update `MODEL_PATH` in `configs/config.py`

### Error: "No module named 'geopandas'"

**Solution:**
```bash
pip install geopandas
# On Windows, may need:
conda install geopandas
```

### Error: "Computation timed out"

**Cause:** Google Earth Engine quota or slow connection

**Solution:**
1. Reduce grid density (increase `grid_spacing`)
2. Add more delays between requests:
   ```python
   if (i + 1) % 50 == 0:
       time.sleep(5)  # Increase from 2 to 5 seconds
   ```
3. Process smaller regions

### Error: "GDAL not found" (Windows)

**Solution:**
```bash
# Install via Conda (easier on Windows)
conda install -c conda-forge geopandas

# Or use wheel file from:
# https://www.lfd.uci.edu/~gohlke/pythonlibs/
```

### Warning: CRS Warning

**Not an error**, just informational. Files are correctly in WGS84.

---

## Performance Tips

### Speed Up Processing

1. **Increase Grid Spacing:**
   ```python
   'grid_spacing': 0.2  # Instead of 0.1
   ```

2. **Process Smaller Batches:**
   ```python
   # Split region into smaller chunks
   lats = np.arange(min_lat, max_lat, 0.5)  # Process 0.5° at a time
   ```

3. **Use Parallel Processing:** (Advanced)
   ```python
   from concurrent.futures import ThreadPoolExecutor
   # Implement parallel GEE requests
   ```

4. **Cache GEE Results:**
   - Save extracted features to CSV first
   - Run predictions separately

### Reduce GEE Quota Usage

- Increase rate limiting delays
- Use coarser grid spacing
- Process during off-peak hours
- Request GEE premium quota (if needed)

---

## Output Files Reference

Each run creates these files:

| File | Size (approx) | Purpose |
|------|--------------|---------|
| `*.shp` | 1-10 KB | Shapefile geometry |
| `*.shx` | < 1 KB | Shape index |
| `*.dbf` | 1-50 KB | Attribute table |
| `*.prj` | < 1 KB | Projection definition |
| `*.cpg` | < 1 KB | Codepage (UTF-8) |
| `*.geojson` | 2-100 KB | GeoJSON (text format) |
| `*.csv` | 1-50 KB | CSV with XY columns |
| `*_layer.json` | 2 KB | Styling definition |

**Note:** Sizes depend on number of points generated.

---

## Example Workflows

### Workflow 1: Quick City Assessment

```bash
# 1. Generate predictions
python generate_arcgis_predictions.py

# 2. Files created in data/outputs/arcgis/
# 3. Import to ArcGIS (see ARCGIS_INTEGRATION_GUIDE.md)
```

**Time:** 1-2 minutes  
**Output:** 10 cities

### Workflow 2: State-Level Assessment

```bash
# 1. Generate for Maharashtra
python generate_arcgis_predictions.py --region maharashtra

# 2. Takes ~30-60 minutes
# 3. Creates flood_risk_maharashtra.* files
```

**Time:** 30-60 minutes  
**Output:** ~500-1000 points (depending on grid spacing)

### Workflow 3: Multiple Regions

```bash
# Process all predefined regions
python generate_arcgis_predictions.py --all
```

**Time:** 1-2 hours  
**Output:** Multiple datasets

---

## Advanced: Batch Processing Script

Create `batch_process.py`:

```python
import subprocess
import time

regions = ['telangana', 'maharashtra', 'tamil_nadu']

for region in regions:
    print(f"\n{'='*60}")
    print(f"Processing: {region}")
    print('='*60)
    
    result = subprocess.run([
        'python', 
        'generate_arcgis_predictions.py', 
        '--region', 
        region
    ])
    
    if result.returncode == 0:
        print(f"✅ {region} completed successfully")
    else:
        print(f"❌ {region} failed")
    
    # Pause between regions
    time.sleep(60)

print("\n✅ All regions processed!")
```

Run:
```bash
python batch_process.py
```

---

## Code Structure

### arcgis_export.py

**Functions:**
- `export_to_geojson(df, path)` - Export to GeoJSON
- `export_to_csv(df, path)` - Export to CSV
- `export_to_shapefile(df, path)` - Export to Shapefile
- `create_arcgis_layer_file(df, path)` - Create styling JSON
- `export_all_formats(df, basename)` - Export all at once

**Example Usage:**
```python
import pandas as pd
from arcgis_export import export_all_formats

# Your predictions DataFrame
df = pd.DataFrame({
    'location': ['Mumbai'],
    'latitude': [19.076],
    'longitude': [72.8777],
    'flood_prob': [0.95],
    'risk_level': ['HIGH'],
    'rainfall': [250.5],
    'soil_moist': [0.45],
    'elevation': [10.0],
    'slope': [2.5]
})

# Export all formats
export_all_formats(df, 'my_predictions')
```

### generate_arcgis_predictions.py

**Functions:**
- `generate_grid_locations(bounds, spacing)` - Create point grid
- `predict_grid_batch(locations, model)` - Batch predictions
- `generate_predictions_for_region(config)` - Regional predictions
- `generate_predictions_for_cities(cities)` - City predictions

**Main Execution:**
```python
if __name__ == "__main__":
    # Command-line argument parsing
    # Region selection
    # Processing logic
```

---

## Dependencies Graph

```
generate_arcgis_predictions.py
├── arcgis_export.py
│   ├── geopandas (Shapefile/GeoJSON export)
│   ├── pandas (Data handling)
│   └── shapely (Geometry)
│
├── feature_extraction_gee.py (Not included - from main system)
│   └── earthengine-api (Google Earth Engine)
│
├── configs/config.py (Not included - from main system)
│   └── GEE_PROJECT, MODEL_PATH
│
└── models/flood_model_optimized.pkl (Not included - trained model)
    └── scikit-learn (ML predictions)
```

---

## Quick Reference

```bash
# Test export
python arcgis_export.py

# Major cities (default)
python generate_arcgis_predictions.py

# Specific region
python generate_arcgis_predictions.py --region telangana

# All regions
python generate_arcgis_predictions.py --all

# Help
python generate_arcgis_predictions.py --help
```

---

## Next Steps

1. ✅ Install Python and dependencies
2. ✅ Set up Google Earth Engine
3. ✅ Configure config.py with GEE project
4. ✅ Place model file in correct location
5. ✅ Run test export
6. ✅ Generate predictions
7. ✅ Import to ArcGIS (see ARCGIS_INTEGRATION_GUIDE.md)

---

**Last Updated:** February 21, 2026  
**Python Version:** 3.8+  
**Supported OS:** Windows, Linux, macOS
