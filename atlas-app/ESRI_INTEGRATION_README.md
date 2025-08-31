# Esri ArcGIS Integration Guide

## Overview
This guide explains how to integrate Esri ArcGIS maps into your Angular application for the explore-map component.

## What's Been Implemented

### 1. Dependencies Installed
- `@arcgis/core` - Core Esri ArcGIS JavaScript API
- `@types/arcgis-js-api` - TypeScript type definitions

### 2. Configuration Updates
- **Angular.json**: Added Esri assets to build configuration
- **Styles.scss**: Imported Esri CSS theme
- **Budget Limits**: Updated to accommodate Esri library size

### 3. Component Features
- **Interactive Map**: Full-featured ArcGIS map with zoom, pan, and navigation
- **Multiple Basemaps**: 8 different basemap options with easy switching
- **Map Widgets**: Basemap toggle, gallery, and layer list
- **Water Risk Layers**: Example feature layer for water risk assessment
- **Transparency Control**: Slider to control layer opacity
- **RTL Support**: Maintains right-to-left layout for Arabic content

## Setup Instructions

### 1. Get an Esri API Key
1. Go to [ArcGIS Developers](https://developers.arcgis.com/)
2. Sign up for a free account
3. Create a new application
4. Copy your API key

### 2. Update the API Key (Optional)
The current implementation uses public basemaps that don't require authentication. If you need premium services, uncomment and add your API key in `src/app/explore-map/explore-map.ts`:
```typescript
// config.apiKey = 'YOUR_ESRI_API_KEY'; // Uncomment and add your API key for premium services
```

### 3. Customize the Map
The map is currently configured with:
- **Basemap**: Streets Vector map with city names and labels
- **Center**: Saudi Arabia (coordinates: [45.0792, 23.8859])
- **Zoom Level**: 6
- **Rotation**: Disabled for better user experience

## Available Map Features

### Basemaps
The component now includes 9 different basemap options (using public basemaps that don't require authentication):
- **Streets Vector** (خريطة الشوارع مع أسماء المدن) - Default, street-level map with city names and labels
- **Streets Navigation Vector** (خريطة الشوارع) - Street-level navigation map
- **Satellite** (صور فضائية) - High-resolution satellite imagery
- **Hybrid** (خريطة مختلطة) - Combination of satellite and street data
- **Terrain** (خريطة التضاريس) - 3D terrain visualization
- **Oceans** (خريطة المحيطات) - Ocean-focused basemap
- **Dark Gray Vector** (خريطة رمادية داكنة) - Dark theme for low-light environments
- **Light Gray Vector** (خريطة رمادية فاتحة) - Light theme for general use
- **Topographic Vector** (خريطة طبوغرافية) - Shows terrain and features

**Basemap Controls:**
- **Navigation Buttons**: Left/right arrows to cycle through basemaps
- **Current Basemap Display**: Shows the active basemap name
- **Basemap Selector**: **Collapsible** right-side panel with visual previews and names
- **Arabic Labels**: All basemap names are displayed in Arabic
- **Collapsible Design**: Selector is collapsed by default to avoid map interference
- **Toggle Button**: Click to expand/collapse the basemap options
- **Refresh Button**: Manual map refresh if needed

### Widgets
- **Basemap Toggle**: Switch between two basemaps
- **Basemap Gallery**: Choose from multiple basemap options
- **Layer List**: Manage map layers and their visibility

### Water Risk Layer
Currently includes an example layer using world countries data. You can:
- Replace with your actual water risk data
- Customize popup templates
- Add multiple layers for different risk types
- Style layers based on risk values

## Customization Options

### 1. Change Map Center and Zoom
```typescript
this.mapView = new MapView({
  container: this.mapViewEl.nativeElement,
  map: this.map,
  zoom: 6, // Change zoom level
  center: [45.0792, 23.8859], // Saudi Arabia coordinates (longitude, latitude)
  constraints: {
    rotationEnabled: false
  }
});
```

### 2. Add Custom Layers
```typescript
const customLayer = new FeatureLayer({
  url: 'YOUR_FEATURE_SERVICE_URL',
  title: 'Custom Layer',
  opacity: 0.8,
  popupTemplate: {
    title: '{LAYER_NAME}',
    content: 'Custom content here'
  }
});
this.map.add(customLayer);
```

### 3. Customize Widgets
```typescript
// Add custom widget positions
this.mapView.ui.add(basemapToggle, 'bottom-left');
this.mapView.ui.add(layerList, 'top-left');
```

### 4. Customize Basemaps
```typescript
// Add custom basemap
this.basemaps.push('custom-basemap-id');

// Change basemap programmatically
this.setBasemap('satellite');

// Navigate through basemaps
this.changeBasemap('next');
this.changeBasemap('previous');
```

## Troubleshooting

### Common Issues

1. **Map Not Displaying**
   - Check browser console for errors
   - Verify API key is valid
   - Ensure Esri assets are properly loaded

2. **Map Disappearing After Adding Basemaps**
   - **Problem**: Map becomes invisible after implementing basemap controls
   - **Causes**: Z-index conflicts, absolute positioning overlaps, map container initialization issues
   - **Solutions**: 
     - Ensure map container has `position: relative` and `z-index: 1`
     - Position basemap controls with proper z-index values
     - Use collapsible basemap selector (collapsed by default)
     - Add loading states and fallback content

3. **Basemap Selector Positioning Issues**
   - **Problem**: Basemap selector covers the map or other controls
   - **Solution**: 
     - Selector is now collapsible (collapsed by default)
     - Positioned below the toggle button to avoid overlap
     - Proper spacing and z-index values implemented
     - Responsive positioning for mobile devices

4. **Angular ExpressionChangedAfterItHasBeenCheckedError**
   - **Problem**: Map initialization causes Angular change detection errors
   - **Solution**: Use `setTimeout(() => { this.initializeMap(); }, 0)` in `ngAfterViewInit()`

5. **Esri Layer Loading Failures**
   - **Problem**: Feature layers and basemaps fail to load
   - **Causes**: Missing API key, authentication issues, invalid service URLs
   - **Solutions**:
     - Use public basemaps that don't require authentication
     - Comment out problematic feature layers during development
     - Add proper error handling for layer loading

2. **Performance Issues**
   - Consider using layer filtering
   - Implement layer visibility toggles
   - Use appropriate zoom levels for data density

3. **Build Errors**
   - Ensure all dependencies are installed
   - Check Angular budget limits
   - Verify asset paths in angular.json

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers supported
- IE11 not supported (use ArcGIS API 4.x for IE11 support)

## Next Steps

### 1. Add Real Data
- Replace example layer with actual water risk data
- Implement data filtering and querying
- Add time-based data visualization

### 2. Enhanced Interactivity
- Add measurement tools
- Implement drawing tools
- Add search and geocoding

### 3. Performance Optimization
- Implement layer caching
- Add progressive loading
- Optimize for mobile devices

## Resources

- [ArcGIS API for JavaScript Documentation](https://developers.arcgis.com/javascript/latest/)
- [Angular Integration Examples](https://developers.arcgis.com/javascript/latest/guide/angular/)
- [Esri Developer Community](https://community.esri.com/)

## Support

For Esri-specific issues:
- [Esri Developer Support](https://developers.arcgis.com/support/)
- [ArcGIS API Forum](https://community.esri.com/t5/arcgis-api-for-javascript/bd-p/arcgis-api-for-javascript)

For Angular integration issues:
- Check the component code in `src/app/explore-map/`
- Review browser console for errors
- Verify all configuration steps are completed
