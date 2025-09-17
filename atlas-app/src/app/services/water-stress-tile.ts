// water-stress-config.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface WaterStressTileLayer {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  tilePath: string;
  localPath: string; // Path to local tiles
  opacity: number;
  minZoom: number;
  maxZoom: number;
  visible: boolean;
  attribution?: string;
  extent?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class WaterStressTileConfigService {
  
  // Base path for local tiles (relative to the Angular assets folder)
  private readonly TILES_BASE_PATH = '../../Water Stress';
  
  // Water stress tile layers configuration
  private readonly waterStressTileLayers: WaterStressTileLayer[] = [
    {
      id: 'water-stress',
      name: 'Water Stress',
      nameAr: 'الإجهاد المائي',
      description: 'Water stress levels across Saudi Arabia',
      descriptionAr: 'مستويات الإجهاد المائي في المملكة العربية السعودية',
      tilePath: `${this.TILES_BASE_PATH}/Water Stress/{z}/{x}/{y}.png`,
      localPath: 'D:/Projects/evara/Water Stress/Water Stress',
      opacity: 0.7,
      minZoom: 0,
      maxZoom: 18,
      visible: false,
      extent: {
        xmin: 34.5,
        ymin: 16.0,
        xmax: 55.5,
        ymax: 32.5
      }
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Get all available water stress tile layers
   */
  getWaterStressTileLayers(): WaterStressTileLayer[] {
    return [...this.waterStressTileLayers];
  }

  /**
   * Get a specific water stress tile layer by ID
   */
  getWaterStressTileLayerById(id: string): WaterStressTileLayer | undefined {
    return this.waterStressTileLayers.find(layer => layer.id === id);
  }

  /**
   * Get layers filtered by category/type
   */
  getLayersByType(type: 'stress' | 'quality' | 'risk' | 'scarcity'): WaterStressTileLayer[] {
    const typeMapping = {
      stress: ['annual-water-stress', 'seasonal-water-stress', 'surface-water-stress'],
      quality: ['water-quality'],
      risk: ['drought-risk', 'flood-risk', 'groundwater-depletion'],
      scarcity: ['water-scarcity']
    };
    
    return this.waterStressTileLayers.filter(layer => 
      typeMapping[type].includes(layer.id)
    );
  }

  /**
   * Check if tile directory exists and scan for available zoom levels
   */
  async scanTileDirectory(layerId: string): Promise<{
    exists: boolean;
    availableZooms: number[];
    sampleTiles: string[];
  }> {
    const layer = this.getWaterStressTileLayerById(layerId);
    if (!layer) {
      return { exists: false, availableZooms: [], sampleTiles: [] };
    }

    const availableZooms: number[] = [];
    const sampleTiles: string[] = [];

    // Check zoom levels from 0 to max
    for (let z = 0; z <= layer.maxZoom; z++) {
      // Check a few sample tiles at this zoom level
      const sampleCoords = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: Math.floor(Math.pow(2, z) / 2), y: Math.floor(Math.pow(2, z) / 2) }
      ];

      for (const coord of sampleCoords) {
        if (coord.x >= Math.pow(2, z) || coord.y >= Math.pow(2, z)) continue;
        
        const tileUrl = this.buildTileUrl(layer.tilePath, z, coord.x, coord.y);
        const exists = await this.checkTileExists(tileUrl);
        
        if (exists) {
          if (!availableZooms.includes(z)) {
            availableZooms.push(z);
          }
          sampleTiles.push(tileUrl);
          break; // Found at least one tile at this zoom level
        }
      }
    }

    return {
      exists: availableZooms.length > 0,
      availableZooms: availableZooms.sort((a, b) => a - b),
      sampleTiles
    };
  }

  /**
   * Build tile URL from template
   */
  buildTileUrl(template: string, z: number, x: number, y: number): string {
    return template
      .replace('{z}', z.toString())
      .replace('{x}', x.toString())
      .replace('{y}', y.toString());
  }

  /**
   * Check if a specific tile exists
   */
  async checkTileExists(tileUrl: string): Promise<boolean> {
    try {
      const response = await fetch(tileUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.warn(`Tile check failed for ${tileUrl}:`, error);
      return false;
    }
  }

  /**
   * Get suggested layers based on risk type
   */
  getSuggestedLayersForRiskType(riskType: string): WaterStressTileLayer[] {
    const riskTypeMapping: { [key: string]: string[] } = {
      'مخاطر الحوض المادية': ['annual-water-stress', 'groundwater-depletion'],
      'مخاطر الجفاف': ['drought-risk', 'seasonal-water-stress'],
      'مخاطر الفيضانات': ['flood-risk'],
      'جودة المياه': ['water-quality'],
      'ندرة المياه': ['water-scarcity', 'surface-water-stress']
    };

    const suggestedIds = riskTypeMapping[riskType] || [];
    return this.waterStressTileLayers.filter(layer => 
      suggestedIds.includes(layer.id)
    );
  }

  /**
   * Load metadata from external JSON file (if available)
   */
  async loadMetadataFromFile(filePath: string = 'assets/waterstress-metadata.json'): Promise<WaterStressTileLayer[]> {
    try {
      const metadata = await this.http.get<WaterStressTileLayer[]>(filePath).toPromise();
      return metadata || [];
    } catch (error) {
      console.warn('Could not load metadata from file, using default configuration');
      return this.waterStressTileLayers;
    }
  }

  /**
   * Validate tile layer configuration
   */
  validateTileLayer(layer: WaterStressTileLayer): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!layer.id || layer.id.trim() === '') {
      errors.push('Layer ID is required');
    }

    if (!layer.tilePath || layer.tilePath.trim() === '') {
      errors.push('Tile path is required');
    }

    if (layer.minZoom < 0 || layer.minZoom > 20) {
      warnings.push('Min zoom level should be between 0 and 20');
    }

    if (layer.maxZoom < layer.minZoom || layer.maxZoom > 20) {
      errors.push('Max zoom level should be greater than min zoom and not exceed 20');
    }

    if (layer.opacity < 0 || layer.opacity > 1) {
      errors.push('Opacity should be between 0 and 1');
    }

    if (layer.extent) {
      if (layer.extent.xmin >= layer.extent.xmax || layer.extent.ymin >= layer.extent.ymax) {
        errors.push('Invalid extent coordinates');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}