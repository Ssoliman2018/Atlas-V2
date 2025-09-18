// tile-server.js - Simple Node.js server to serve XYZ tiles
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3333;

// Enable CORS for all origins
app.use(cors());

// Base path to your projects directory
const TILES_BASE_PATH = 'D:/Projects/evara';

// Middleware to log tile requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static tiles
app.get('/tiles/:layer/:z/:x/:y.png', (req, res) => {
  const { layer, z, x, y } = req.params;
  
  console.log(`Tile request - Layer: ${layer}, Z: ${z}, X: ${x}, Y: ${y}`);
  
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
    
    // Send the file
    res.sendFile(tilePath);
  } else {
    console.log(`Tile not found: ${tilePath}`);
    res.status(404).json({ 
      error: 'Tile not found', 
      path: tilePath,
      layer,
      z,
      x,
      y
    });
  }
});

// List available layers
app.get('/layers', (req, res) => {
  try {
    // List available layers based on our configuration
    const layers = [
      {
        id: 'annual_water_stress',
        name: 'Annual Water Stress',
        path: 'Water Stress/Water Stress'
      },
      {
        id: 'riverine_flood_risk', 
        name: 'Riverine Flood Risk',
        path: 'Riverine flood risk/Riverine flood risk'
      },
      {
        id: 'coastal_flood_risk',
        name: 'Coastal Flood Risk',
        path: 'Coastal flood risk/Coastal flood risk'
      }
    ];
    
    // Check if each layer directory exists
    const availableLayers = layers.filter(layer => {
      const layerPath = path.join(TILES_BASE_PATH, layer.path);
      return fs.existsSync(layerPath);
    });
    
    res.json({ 
      layers: availableLayers,
      total: availableLayers.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not read tiles directory' });
  }
});

// Get layer information
app.get('/layers/:layer/info', (req, res) => {
  const { layer } = req.params;
  
  // Define layer paths
  const layerPaths = {
    'annual_water_stress': 'Water Stress/Water Stress',
    'riverine_flood_risk': 'Riverine flood risk/Riverine flood risk',
    'coastal_flood_risk': 'Coastal flood risk/Coastal flood risk'
  };
  
  const layerSubPath = layerPaths[layer];
  if (!layerSubPath) {
    return res.status(404).json({ 
      error: 'Layer not found',
      availableLayers: Object.keys(layerPaths)
    });
  }
  
  const layerPath = path.join(TILES_BASE_PATH, layerSubPath);
  
  if (!fs.existsSync(layerPath)) {
    return res.status(404).json({ 
      error: 'Layer directory not found',
      expectedPath: layerPath
    });
  }
  
  try {
    // Scan for available zoom levels
    const zoomLevels = fs.readdirSync(layerPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => parseInt(dirent.name))
      .filter(zoom => !isNaN(zoom))
      .sort((a, b) => a - b);
    
    // Get tile count for each zoom level
    const zoomInfo = zoomLevels.map(zoom => {
      const zoomPath = path.join(layerPath, zoom.toString());
      const xDirs = fs.readdirSync(zoomPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .length;
      
      let totalTiles = 0;
      fs.readdirSync(zoomPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .forEach(xDir => {
          const xPath = path.join(zoomPath, xDir.name);
          const tiles = fs.readdirSync(xPath)
            .filter(file => file.endsWith('.png'))
            .length;
          totalTiles += tiles;
        });
      
      return {
        zoom,
        xDirectories: xDirs,
        totalTiles
      };
    });
    
    res.json({
      layer,
      layerPath,
      availableZooms: zoomLevels,
      minZoom: Math.min(...zoomLevels),
      maxZoom: Math.max(...zoomLevels),
      zoomInfo
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Could not read layer information',
      details: error.message
    });
  }
});

// Debug route to catch any malformed requests
app.get('/tiles/*', (req, res) => {
  console.log('🚨 Malformed tile request:', {
    url: req.url,
    params: req.params,
    query: req.query
  });
  
  res.status(400).json({
    error: 'Malformed tile request',
    received: req.url,
    expected: '/tiles/{layer}/{z}/{x}/{y}.png'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    tilesPath: TILES_BASE_PATH
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Tile server running on http://localhost:${PORT}`);
  console.log(`Serving tiles from: ${TILES_BASE_PATH}`);
  console.log('\nAvailable endpoints:');
  console.log(`  GET /tiles/:layer/:z/:x/:y.png - Serve individual tiles`);
  console.log(`  GET /layers - List available layers`);
  console.log(`  GET /layers/:layer/info - Get layer information`);
  console.log(`  GET /health - Health check`);
  
  // Try to list available layers on startup
  try {
    console.log('\n📁 Checking available tile layers:');
    
    const layerConfigs = [
      { id: 'annual_water_stress', name: 'Annual Water Stress', path: 'Water Stress/Water Stress' },
      { id: 'riverine_flood_risk', name: 'Riverine Flood Risk', path: 'Riverine flood risk/Riverine flood risk' },
      { id: 'coastal_flood_risk', name: 'Coastal Flood Risk', path: 'Coastal flood risk/Coastal flood risk' }
    ];
    
    layerConfigs.forEach(config => {
      const layerPath = path.join(TILES_BASE_PATH, config.path);
      if (fs.existsSync(layerPath)) {
        console.log(`✅ ${config.name} found at: ${layerPath}`);
        
        // List zoom levels
        try {
          const zoomLevels = fs.readdirSync(layerPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .sort();
          
          console.log(`   📊 Available zoom levels: ${zoomLevels.join(', ')}`);
        } catch (err) {
          console.log(`   ⚠️ Could not read zoom levels: ${err.message}`);
        }
      } else {
        console.log(`❌ ${config.name} NOT FOUND at: ${layerPath}`);
      }
    });
  } catch (error) {
    console.error('Could not check tiles directories:', error.message);
  }
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