# 📄 File Specifications

## Overview

Technical specifications for all generated ArcGIS files in this package.

---

## File Formats

### 1. ESRI Shapefile (.shp, .shx, .dbf, .prj, .cpg)

**Description:** Industry-standard GIS vector format

**Components:**

| File Extension | Purpose | Required |
|----------------|---------|----------|
| `.shp` | Geometry (points) | ✅ Yes |
| `.shx` | Shape index | ✅ Yes |
| `.dbf` | Attribute table | ✅ Yes |
| `.prj` | Projection definition | ✅ Yes |
| `.cpg` | Character encoding | ⚠️ Recommended |

**Geometry Type:** Point (2D)

**Coordinate System:**
- **Name:** GCS_WGS_1984
- **Datum:** WGS84
- **EPSG Code:** 4326
- **WKID:** 4326
- **Unit:** Decimal Degrees

**Projection String (WKT):**
```
GEOGCS["GCS_WGS_1984",
  DATUM["WGS_1984",
    SPHEROID["WGS_1984",6378137,298.257223563]],
  PRIMEM["Greenwich",0],
  UNIT["Degree",0.017453292519943295]]
```

**Character Encoding:** UTF-8 (specified in .cpg file)

**Compatibility:**
- ✅ ArcGIS Desktop (10.x+)
- ✅ ArcGIS Pro (all versions)
- ✅ QGIS (all versions)
- ✅ MapInfo
- ✅ Global Mapper
- ✅ Most GIS software

---

### 2. GeoJSON (.geojson)

**Description:** Open-standard geographic data format based on JSON

**Specification:** [RFC 7946](https://tools.ietf.org/html/rfc7946)

**Structure:**
```json
{
  "type": "FeatureCollection",
  "crs": {
    "type": "name",
    "properties": {
      "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
    }
  },
  "features": [
    {
      "type": "Feature",
      "properties": {
        "location": "Mumbai",
        "latitude": 19.076,
        "longitude": 72.8777,
        "flood_prob": 0.977,
        "risk_level": "HIGH",
        "rainfall": 0.01,
        "soil_moist": 0.1152,
        "elevation": 14.74,
        "slope": 3.15
      },
      "geometry": {
        "type": "Point",
        "coordinates": [72.8777, 19.076]
      }
    }
  ]
}
```

**Key Points:**
- Coordinates in `[longitude, latitude]` order (per RFC 7946)
- Human-readable text format
- No size limit (unlike Shapefile's 2GB limit)
- Supports nested properties

**Compatibility:**
- ✅ ArcGIS Online (native support)
- ✅ ArcGIS Pro 2.0+
- ✅ Mapbox GL JS
- ✅ Leaflet
- ✅ OpenLayers
- ✅ Google Maps API
- ✅ QGIS
- ✅ Web browsers (JavaScript)

**Typical File Size:** 2-100 KB (depends on number of features)

---

### 3. CSV (.csv)

**Description:** Comma-separated values with XY coordinates

**Structure:**
```csv
location,latitude,longitude,flood_prob,risk_level,rainfall,soil_moist,elevation,slope
Mumbai,19.076,72.8777,0.977,HIGH,0.01,0.1152,14.74,3.15
Delhi,28.7041,77.1025,0.026,LOW,0.0,0.2049,216.32,2.87
```

**Specifications:**
- **Delimiter:** Comma (`,`)
- **Encoding:** UTF-8
- **Line Ending:** CRLF (Windows) or LF (Unix)
- **Header:** First row contains field names
- **Quote Character:** Double quote (`"`) for fields with commas
- **Decimal Separator:** Period (`.`)

**Coordinate Fields:**
- `latitude` - Decimal degrees, positive = North
- `longitude` - Decimal degrees, positive = East

**Import to ArcGIS:**
1. Add CSV as table
2. Display XY Data tool
3. Set X Field = `longitude`, Y Field = `latitude`
4. Set Coordinate System = GCS WGS 1984

**Compatibility:**
- ✅ ArcGIS (all versions with XY display)
- ✅ Excel, Google Sheets
- ✅ QGIS (via delimited text layer)
- ✅ Python (pandas)
- ✅ R (read.csv)
- ✅ Any text editor

---

### 4. Layer Definition JSON (*_layer.json)

**Description:** ArcGIS-compatible layer styling definition

**Purpose:**
- Defines symbology (colors, sizes)
- Field aliases
- Rendering properties
- Not imported as data, used as reference

**Structure:**
```json
{
  "name": "Flood Risk Predictions",
  "type": "Feature Layer",
  "geometryType": "esriGeometryPoint",
  "spatialReference": {
    "wkid": 4326
  },
  "fields": [...],
  "drawingInfo": {
    "renderer": {
      "type": "uniqueValue",
      "field1": "risk_level",
      "uniqueValueInfos": [
        {
          "value": "HIGH",
          "symbol": {
            "type": "esriSMS",
            "style": "esriSMSCircle",
            "color": [239, 68, 68, 255],
            "size": 8
          }
        }
      ]
    }
  }
}
```

**Usage:**
- Reference for manual symbology setup
- Can be used in ArcGIS REST API
- Provides color codes and rendering rules

---

## Attributes Schema

### Field Definitions

| Field Name | Data Type | Precision | Scale | Length | Nullable | Description |
|------------|-----------|-----------|-------|--------|----------|-------------|
| `location` | String | - | - | 50 | No | Location name |
| `latitude` | Double | 15 | 6 | - | No | Latitude (decimal degrees) |
| `longitude` | Double | 15 | 6 | - | No | Longitude (decimal degrees) |
| `flood_prob` | Double | 10 | 3 | - | No | Flood probability (0.0-1.0) |
| `risk_level` | String | - | - | 10 | No | Risk category (LOW/MEDIUM/HIGH) |
| `rainfall` | Double | 10 | 2 | - | Yes | 7-day rainfall (mm) |
| `soil_moist` | Double | 10 | 4 | - | Yes | Soil moisture index (0-1) |
| `elevation` | Double | 10 | 2 | - | Yes | Elevation (meters) |
| `slope` | Double | 10 | 2 | - | Yes | Slope (degrees) |

### Field Aliases (User-Friendly Names)

| Field Name | Alias |
|------------|-------|
| `location` | Location |
| `latitude` | Latitude |
| `longitude` | Longitude |
| `flood_prob` | Flood Probability |
| `risk_level` | Risk Level |
| `rainfall` | Rainfall (mm) |
| `soil_moist` | Soil Moisture |
| `elevation` | Elevation (m) |
| `slope` | Slope (deg) |

### Value Domains

**risk_level (String):**
- Valid values: `"LOW"`, `"MEDIUM"`, `"HIGH"`
- Constraint: Must be one of the three values
- Case-sensitive: Uppercase only

**flood_prob (Double):**
- Range: 0.0 - 1.0
- Format: Decimal (0.000 - 1.000)
- Interpretation: 0.75 = 75% probability

**rainfall (Double):**
- Range: 0.0 - 1000.0+ (mm)
- Unit: Millimeters
- Represents: 7-day cumulative rainfall

**soil_moist (Double):**
- Range: 0.0 - 1.0
- Format: Decimal index
- Higher = Wetter soil

**elevation (Double):**
- Range: -100 to 9000+ (meters)
- Unit: Meters above sea level
- Source: SRTM DEM

**slope (Double):**
- Range: 0.0 - 90.0 (degrees)
- Unit: Degrees
- 0 = Flat, 90 = Vertical

---

## Data Quality

### Completeness

| Field | Required | Can be NULL | Default Value |
|-------|----------|-------------|---------------|
| `location` | ✅ | ❌ | N/A |
| `latitude` | ✅ | ❌ | N/A |
| `longitude` | ✅ | ❌ | N/A |
| `flood_prob` | ✅ | ❌ | N/A |
| `risk_level` | ✅ | ❌ | N/A |
| `rainfall` | ⚠️ | ✅ | NULL (if unavailable) |
| `soil_moist` | ⚠️ | ✅ | NULL (if unavailable) |
| `elevation` | ⚠️ | ✅ | NULL (if unavailable) |
| `slope` | ⚠️ | ✅ | NULL (if unavailable) |

### Accuracy

**Spatial Accuracy:**
- Coordinates: ±0.0001° (~11 meters)
- Source: User input or grid generation

**Attribute Accuracy:**
- Flood Probability: ML model prediction (95%+ accuracy on training data)
- Rainfall: CHIRPS satellite data (±10-15%)
- Soil Moisture: ERA5-Land model (±0.05)
- Elevation: SRTM DEM (±16m vertical accuracy)
- Slope: Calculated from DEM (±2-5°)

### Coverage

**Geographic Coverage:**
- Primary: India
- Specific datasets:
  - Major Cities: 10 cities
  - State-level: Telangana, Maharashtra, Tamil Nadu (if generated)

**Temporal Coverage:**
- Date window: 7 days (typically 30-37 days before generation date)
- Reasoning: Ensures data availability in Earth Engine

---

## File Size Reference

### Typical Sizes (10 Major Cities)

| File | Size |
|------|------|
| `*.shp` | ~1-2 KB |
| `*.shx` | ~200 bytes |
| `*.dbf` | ~1-2 KB |
| `*.prj` | ~400 bytes |
| `*.cpg` | ~5 bytes |
| `*.geojson` | ~3-5 KB |
| `*.csv` | ~1-2 KB |
| `*_layer.json` | ~2 KB |
| **Total per dataset** | **~10-15 KB** |

### Sizes for Grid Datasets

**Grid spacing 0.2° (Telangana example, ~1000 points):**

| File | Size |
|------|------|
| `*.shp` | ~50-100 KB |
| `*.dbf` | ~100-200 KB |
| `*.geojson` | ~300-500 KB |
| `*.csv` | ~100-200 KB |
| **Total** | **~500 KB - 1 MB** |

**Note:** Sizes scale linearly with number of points.

---

## Software Compatibility Matrix

| Software | Shapefile | GeoJSON | CSV |
|----------|-----------|---------|-----|
| **ArcGIS Desktop 10.x** | ✅ Native | ⚠️ 10.3+ | ✅ XY Display |
| **ArcGIS Pro** | ✅ Native | ✅ Native | ✅ XY Display |
| **ArcGIS Online** | ✅ Upload | ✅ Native | ✅ XY Upload |
| **QGIS** | ✅ Native | ✅ Native | ✅ Delimited Text |
| **Google Earth Pro** | ⚠️ Via KML | ⚠️ Convert | ⚠️ Convert |
| **MapInfo** | ✅ Import | ⚠️ Limited | ✅ Import |
| **Global Mapper** | ✅ Native | ✅ Native | ✅ ASCII Import |
| **Python (GeoPandas)** | ✅ .read_file() | ✅ .read_file() | ⚠️ Manual |
| **R (sf package)** | ✅ st_read() | ✅ st_read() | ⚠️ Manual |
| **Web Maps (Leaflet)** | ❌ | ✅ Native | ❌ |

**Legend:**
- ✅ Full support
- ⚠️ Limited/requires conversion
- ❌ Not supported

---

## Metadata

### Spatial Reference Details

**Authority:** EPSG (European Petroleum Survey Group)  
**Code:** 4326  
**Name:** WGS 84 (World Geodetic System 1984)

**Geographic Coordinate System:**
- **Datum:** WGS_1984
- **Ellipsoid:** WGS_1984
  - Semi-major axis: 6,378,137 meters
  - Inverse flattening: 298.257223563
- **Prime Meridian:** Greenwich (0°)

**Angular Unit:** Degree (0.0174532925199433 radians)

**Area of Use:** 
- Entire world
- Latitude: -90° to +90°
- Longitude: -180° to +180°

**Appropriate For:**
- Global datasets
- Unprojected geographic coordinates
- Web mapping applications
- GPS data

**Not Appropriate For:**
- Area calculations (use projected CRS)
- Distance measurements (use projected CRS)
- Large-scale mapping (use local UTM zone)

### Dataset Metadata

**Title:** Flood Risk Predictions for [Region]  
**Abstract:** AI-driven flood risk assessment using Google Earth Engine data and Machine Learning  
**Purpose:** Emergency planning, risk assessment, infrastructure development  
**Status:** Complete  
**Maintenance:** As needed (generate new predictions periodically)

**Keywords:**
- Flood risk
- Machine Learning
- Google Earth Engine
- India
- Natural hazards
- Climate
- Geospatial analysis

**Constraints:**
- **Use Limitation:** Research, planning, and assessment purposes
- **Access Constraints:** None (client delivery)
- **Use Constraints:** Not for real-time emergency response

---

## Technical Notes

### Shapefile Limitations

**Known Limits:**
- Maximum file size: 2 GB (per .shp/.dbf file)
- Maximum field name length: 10 characters
- Maximum string field length: 254 characters
- Maximum number of fields: 255
- Geometry type: Single type only (Point in our case)

**Our Data vs Limits:**
- ✅ File size: < 1 MB (well under 2 GB)
- ✅ Field names: 9 fields, all ≤ 10 chars
- ✅ String fields: Max 50 chars (well under 254)
- ✅ Number of fields: 9 (well under 255)

### GeoJSON Advantages
- No file size limit (JSON text format)
- Supports nested attributes
- Human-readable
- Native web support
- No multi-file dependency

### GeoJSON Limitations
- Larger file size than Shapefile (text vs binary)
- No database-style indexing
- Limited attribute query performance for large datasets

### CSV for GIS

**Advantages:**
- Universal compatibility
- Easy to edit in Excel/spreadsheets
- Can add/remove columns easily
- Processable by any programming language

**Limitations:**
- No embedded geometry (requires XY display)
- No projection information (must specify manually)
- No styling information
- Large files can be slow to display

---

## Validation

### How to Verify Files

**1. Check Shapefile Integrity:**
```python
import geopandas as gpd
gdf = gpd.read_file('flood_predictions.shp')
print(gdf.shape)  # Should show (n_features, n_columns)
print(gdf.crs)    # Should show EPSG:4326
```

**2. Validate GeoJSON:**
- Use: https://geojsonlint.com/
- Or: `python -m json.tool flood_predictions.geojson`

**3. Check CSV:**
Open in text editor, verify:
- Header row present
- All rows have same number of columns
- Coordinates are decimal degrees
- No missing critical values

**4. Visual Check in ArcGIS:**
- Import file
- Zoom to layer extent
- Check if points appear in expected geographic area
- Verify attribute table values

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial release with major cities data |

---

## Contact & Support

For questions about file specifications or data issues:
- Check ARCGIS_INTEGRATION_GUIDE.md for import help
- Check CODE_USAGE.md for generation help
- Verify file integrity using validation methods above

---

**Document Version:** 1.0  
**Last Updated:** February 21, 2026  
**Specification Compliance:** ESRI Shapefile (1998), GeoJSON RFC 7946, CSV RFC 4180
