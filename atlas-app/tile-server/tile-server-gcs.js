// tile-server-gcs.js - Enhanced tile server with Google Cloud Storage support
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');

const app = express();
const PORT = process.env.PORT || 3333;

// Enable CORS for all origins
app.use(cors());

// Google Cloud Storage configuration
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'swat-1e1a3',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS // Path to service account key
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'swat-1e1a3.firebasestorage.app';
const bucket = storage.bucket(BUCKET_NAME);

// Base path to your projects directory (for low-zoom tiles)
const TILES_BASE_PATH = './layers';

// High-zoom threshold - tiles above this zoom level will be served from GCS
const HIGH_ZOOM_THRESHOLD = 7;

// Middleware to log tile requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Function to get tile from Google Cloud Storage
async function getTileFromGCS(layer, z, x, y) {
  try {
    const fileName = `${layer}/${layer}/${z}/${x}/${y}.png`;
    const file = bucket.file(fileName);
    
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }
    
    const [data] = await file.download();
    return data;
  } catch (error) {
    console.error(`Error fetching tile from GCS: ${error.message}`);
    return null;
  }
}

// Serve static tiles
app.get('/tiles/:layer/:z/:x/:y.png', async (req, res) => {
  const { layer, z, x, y } = req.params;
  const zoomLevel = parseInt(z);
  
  console.log(`Tile request - Layer: ${layer}, Z: ${z}, X: ${x}, Y: ${y}`);
  
  // Determine if we should serve from GCS or local storage
  if (zoomLevel >= HIGH_ZOOM_THRESHOLD) {
    // Serve from Google Cloud Storage
    console.log(`Serving high-zoom tile from GCS: ${layer}/${z}/${x}/${y}`);
    
    try {
      const tileData = await getTileFromGCS(layer, z, x, y);
      
      if (tileData) {
        res.set({
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*'
        });
        res.send(tileData);
        return;
      } else {
        console.log(`High-zoom tile not found in GCS: ${layer}/${z}/${x}/${y}`);
        return res.status(404).json({ 
          error: 'High-zoom tile not found in Cloud Storage', 
          layer, z, x, y 
        });
      }
    } catch (error) {
      console.error(`GCS error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to fetch tile from Cloud Storage' });
    }
  } else {
    // Serve from local storage (low-zoom tiles)
    console.log(`Serving low-zoom tile from local storage: ${layer}/${z}/${x}/${y}`);
    
    let tilePath;
    
    // Handle different layer paths based on layer name
    switch (layer) {
      case 'annual_water_stress':
        tilePath = path.join(TILES_BASE_PATH, 'Water Stress', 'Water Stress', z, x, `${y}.png`);
        break;
      case 'riverine_flood_risk':
        tilePath = path.join(TILES_BASE_PATH, 'Riverine flood risk', 'Riverine flood risk', z, x, `${y}.png`);
        break;
      case 'coastal_flood_risk':
        tilePath = path.join(TILES_BASE_PATH, 'Coastal flood risk', 'Coastal flood risk', z, x, `${y}.png`);
        break;
      default:
        console.log(`Unknown layer: ${layer}`);
        return res.status(404).json({ 
          error: 'Unknown layer', 
          layer,
          availableLayers: ['annual_water_stress', 'riverine_flood_risk', 'coastal_flood_risk']
        });
    }
    
    console.log(`Requested tile path: ${tilePath}`);
    
    // Check if file exists
    if (fs.existsSync(tilePath)) {
      // Set appropriate headers
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      });
      
      // Send the file (convert to absolute path)
      res.sendFile(path.resolve(tilePath));
    } else {
      console.log(`Low-zoom tile not found: ${tilePath}`);
      res.status(404).json({ 
        error: 'Low-zoom tile not found', 
        path: tilePath,
        layer, z, x, y
      });
    }
  }
});

// List available layers
app.get('/layers', (req, res) => {
  try {
    const layers = [
      {
        id: 'annual_water_stress',
        name: 'Annual Water Stress',
        path: 'Water Stress/Water Stress',
        lowZoomSource: 'Local Container',
        highZoomSource: 'Google Cloud Storage'
      },
      {
        id: 'riverine_flood_risk', 
        name: 'Riverine Flood Risk',
        path: 'Riverine flood risk/Riverine flood risk',
        lowZoomSource: 'Local Container',
        highZoomSource: 'Google Cloud Storage'
      },
      {
        id: 'coastal_flood_risk',
        name: 'Coastal Flood Risk',
        path: 'Coastal flood risk/Coastal flood risk',
        lowZoomSource: 'Local Container',
        highZoomSource: 'Google Cloud Storage'
      }
    ];
    
    // Check if each layer directory exists locally
    const availableLayers = layers.filter(layer => {
      const layerPath = path.join(TILES_BASE_PATH, layer.path);
      return fs.existsSync(layerPath);
    });
    
    res.json({ 
      layers: availableLayers,
      total: availableLayers.length,
      lowZoomThreshold: HIGH_ZOOM_THRESHOLD,
      storageInfo: {
        lowZoom: 'Local Container (zoom 0-6)',
        highZoom: 'Google Cloud Storage (zoom 7+)',
        bucket: BUCKET_NAME
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not read tiles directory' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    tilesPath: TILES_BASE_PATH,
    gcsBucket: BUCKET_NAME,
    lowZoomThreshold: HIGH_ZOOM_THRESHOLD
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Enhanced tile server running on http://localhost:${PORT}`);
  console.log(`Serving low-zoom tiles from: ${TILES_BASE_PATH}`);
  console.log(`Serving high-zoom tiles from: gs://${BUCKET_NAME}`);
  console.log(`High-zoom threshold: ${HIGH_ZOOM_THRESHOLD}`);
  console.log('\nAvailable endpoints:');
  console.log(`  GET /tiles/:layer/:z/:x/:y.png - Serve individual tiles`);
  console.log(`  GET /layers - List available layers`);
  console.log(`  GET /health - Health check`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
