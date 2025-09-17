import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import BasemapToggle from '@arcgis/core/widgets/BasemapToggle';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import LayerList from '@arcgis/core/widgets/LayerList';
import Legend  from '@arcgis/core/widgets/Legend';
import Expand from '@arcgis/core/widgets/Expand';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer';
import Basemap from '@arcgis/core/Basemap';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';

// Interface for water stress XYZ tile layers
interface WaterStressXYZLayer {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  tilePath: string;
  localPath: string;
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

@Component({
  selector: 'app-explore-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './explore-map.html',
  styleUrls: ['./explore-map.scss']
})
export class ExploreMapComponent implements OnInit, AfterViewInit {
  @ViewChild('mapViewDiv', { static: true }) private mapViewEl!: ElementRef;
  
  activeTab: string = 'استكشاف';
  selectedRiskType: string = 'مخاطر الحوض المادية';
  showMoreInfo: boolean = false;
  transparencyValue: number = 70;
  
  private map: Map | null = null;
  public mapView: MapView | null = null;
  private populationDensityLayer: GraphicsLayer | null = null;
  private waterStressXYZLayers: WebTileLayer[] = [];
  private currentWaterStressLayer: WebTileLayer | null = null;
  private layerMetadata: { [key: string]: WaterStressXYZLayer } = {};
  
  public currentBasemapIndex: number = 0;
  public showBasemapSelector: boolean = false;
  public selectedAdditionalInfo: string = '';
  public showAdditionalInfoDropdown: boolean = false;
  public selectedWaterStressLayer: string = '';
  public showWaterStressDropdown: boolean = false;
  public availableLayers: WaterStressXYZLayer[] = [];
  public isLoadingLayers: boolean = false;
  
  // Local tile server configuration
  private readonly TILE_SERVER_URL = 'http://localhost:3333';
  
  private basemaps: string[] = [
    'streets-vector',
    'streets-navigation-vector',
    'satellite',
    'hybrid',
    'terrain',
    'oceans',
    'dark-gray-vector',
    'light-gray-vector',
    'topo-vector'
  ];

  // Water stress XYZ tile layers configuration
  private waterStressXYZData: WaterStressXYZLayer[] = [
    {
      id: 'annual_water_stress',
      name: 'Annual Water Stress',
      nameAr: 'الإجهاد المائي السنوي',
      description: 'Annual water stress levels across Saudi Arabia',
      descriptionAr: 'مستويات الإجهاد المائي السنوي في المملكة العربية السعودية',
      tilePath: `${this.TILE_SERVER_URL}/tiles/annual_water_stress/{z}/{x}/{y}.png`,
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
    },
    {
      id: 'riverine_flood_risk',
      name: 'Riverine Flood Risk',
      nameAr: 'مخاطر الفيضانات النهرية',
      description: 'Riverine flood risk assessment across Saudi Arabia',
      descriptionAr: 'تقييم مخاطر الفيضانات النهرية في المملكة العربية السعودية',
      tilePath: `${this.TILE_SERVER_URL}/tiles/riverine_flood_risk/{z}/{x}/{y}.png`,
      localPath: 'D:/Projects/evara/Riverine flood risk/Riverine flood risk',
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

  constructor(private router: Router, private http: HttpClient) { }

  ngOnInit(): void {
    this.loadAvailableLayers();
  }

  async ngAfterViewInit(): Promise<void> {
    setTimeout(() => {
      this.initializeMap();
    }, 0);
  }

  /**
   * Load available layers from configuration
   */
  private async loadAvailableLayers(): Promise<void> {
    this.isLoadingLayers = true;
    try {
      console.log('⚡ Loading layers quickly...');
      
      // Load layer configuration immediately
      this.availableLayers = [...this.waterStressXYZData];
      console.log('✅ Layer configuration loaded');
      
      // Check server health in background
      this.checkTileServerHealth().then(serverHealth => {
        if (!serverHealth) {
          console.warn('⚠️ Local tile server is not running. Please start: node tile-server.js');
        } else {
          console.log('✅ Tile server is accessible');
        }
      });
      
      console.log('📊 Available layers:', this.availableLayers.length);
    } catch (error) {
      console.error('❌ Error loading layers:', error);
    } finally {
      this.isLoadingLayers = false;
    }
  }

  /**
   * Check if the local tile server is healthy
   */
  private async checkTileServerHealth(): Promise<boolean> {
    try {
      const response = await this.http.get(`${this.TILE_SERVER_URL}/health`).toPromise();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async initializeMap(): Promise<void> {
    try {
      console.log('🗺️ Starting map initialization...');
      
      this.map = new Map({
        basemap: 'streets-vector'
      });

      this.mapView = new MapView({
        container: this.mapViewEl.nativeElement,
        map: this.map,
        zoom: 6,
        
        center: [45.0792, 23.8859], // Center on Saudi Arabia
        constraints: {
          rotationEnabled: false
        },
        popup: {
          dockEnabled: true,
          dockOptions: {
            position: "top-right",
            breakpoint: false
          }
        }
      });

      await this.addMapWidgets();
      await this.mapView.when();
      
      // Initialize water stress XYZ layers
      await this.initializeWaterStressXYZLayers();
      
      console.log('✅ Map initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing map:', error);
    }
  }

  private async addMapWidgets(): Promise<void> {
    if (!this.mapView) return;

    const basemapToggle = new BasemapToggle({
      view: this.mapView,
      nextBasemap: this.basemaps[(this.currentBasemapIndex + 1) % this.basemaps.length]
    });
    this.mapView.ui.add(basemapToggle, 'top-right');

    const basemapGallery = new BasemapGallery({
      view: this.mapView
    });
    const bgExpand = new Expand({
      view: this.mapView,
      content: basemapGallery,
      expanded: false
    });
    this.mapView.ui.add(bgExpand, 'top-right');

    const layerList = new LayerList({
      view: this.mapView
    });

    const LegendWedgit = new Legend({
            view: this.mapView

    })
    const llExpand = new Expand({
      view: this.mapView,
      content: layerList,
      expanded: false
    });
    const lExpand = new Expand({
      view: this.mapView,
      content: LegendWedgit,
      expanded: false
    });
    this.mapView.ui.add(llExpand, 'top-right');
    this.mapView.ui.add(lExpand, 'top-right');
  }

  /**
   * Initialize water stress XYZ tile layers
   */
  private async initializeWaterStressXYZLayers(): Promise<void> {
    if (!this.map) return;

    try {
      console.log('🚀 Initializing XYZ layers...');
      
      for (const layerConfig of this.availableLayers) {
        const xyzLayer = await this.createWaterStressXYZLayer(layerConfig);
        if (xyzLayer) {
          this.waterStressXYZLayers.push(xyzLayer);
          this.map.add(xyzLayer);
        }
      }
      console.log(`✅ ${this.waterStressXYZLayers.length} XYZ layers initialized`);
    } catch (error) {
      console.error('❌ Error initializing XYZ layers:', error);
    }
  }

  /**
   * Create individual water stress XYZ tile layer
   */
  private async createWaterStressXYZLayer(layerConfig: WaterStressXYZLayer): Promise<WebTileLayer | null> {
    try {
      console.log(`🏗️ Creating layer: ${layerConfig.nameAr}`);
      
      const tileUrlTemplate = layerConfig.tilePath;
      console.log(`📡 URL template: ${tileUrlTemplate}`);

      const webTileLayer = new WebTileLayer({
        title: layerConfig.nameAr,
        urlTemplate: tileUrlTemplate,
        opacity: layerConfig.opacity,
        visible: layerConfig.visible,
        minScale: 0, // Allow viewing at any scale
        maxScale: 0, // Allow viewing at any scale
        copyright: layerConfig.attribution || 'Tile Data'
      });

      // Store layer metadata
      (webTileLayer as any).layerId = layerConfig.id;
      (webTileLayer as any).description = layerConfig.descriptionAr;
      this.layerMetadata[layerConfig.id] = layerConfig;

      // Add error handling
      webTileLayer.on("layerview-create-error", (error) => {
        console.error(`❌ LayerView error for ${layerConfig.nameAr}:`, error);
      });

      // Wait for layer to load
      await webTileLayer.load();
      console.log(`✅ Layer loaded: ${layerConfig.nameAr}`);
      
      return webTileLayer;
    } catch (error) {
      console.error(`❌ Error creating layer ${layerConfig.id}:`, error);
      return null;
    }
  }

  /**
   * Get available water stress layers
   */
  getWaterStressOptions(): WaterStressXYZLayer[] {
    return this.availableLayers;
  }

  /**
   * Toggle water stress dropdown
   */
  toggleWaterStressDropdown(): void {
    this.showWaterStressDropdown = !this.showWaterStressDropdown;
  }

  /**
   * Select and display a water stress layer
   */
  async selectWaterStressLayer(layerId: string): Promise<void> {
    console.log(`🎯 Selecting layer: ${layerId}`);
    this.selectedWaterStressLayer = layerId;
    this.showWaterStressDropdown = false;
    
    // Hide current layer
    if (this.currentWaterStressLayer) {
      this.currentWaterStressLayer.visible = false;
    }

    // Find and show selected layer
    const selectedLayer = this.waterStressXYZLayers.find(layer => 
      (layer as any).layerId === layerId
    );

    if (selectedLayer) {
      console.log(`✅ Found layer, making visible...`);
      
      // Make sure layer is loaded
      if (!selectedLayer.loaded) {
        await selectedLayer.load();
      }
      
      selectedLayer.visible = true;
      selectedLayer.opacity = this.transparencyValue / 100;
      this.currentWaterStressLayer = selectedLayer;
      
      console.log(`🎉 Layer activated: ${layerId}`);
      
      // Test tiles
      await this.testLayerTiles(selectedLayer);
      
      // Zoom to extent if defined
      const layerConfig = this.layerMetadata[layerId];
      if (layerConfig?.extent && this.mapView) {
        setTimeout(async () => {
          await this.mapView!.goTo({
            extent: {
              xmin: layerConfig.extent!.xmin,
              ymin: layerConfig.extent!.ymin,
              xmax: layerConfig.extent!.xmax,
              ymax: layerConfig.extent!.ymax,
              spatialReference: { wkid: 4326 }
            }
          });
        }, 1000);
      }
    } else {
      console.warn(`❌ Layer not found: ${layerId}`);
    }
  }

  /**
   * Test if layer tiles are accessible
   */
  private async testLayerTiles(layer: WebTileLayer): Promise<void> {
    console.log('🧪 Testing layer tiles...');
    
    const testCoords = [
      { z: 0, x: 0, y: 0 },
      { z: 1, x: 0, y: 0 },
      { z: 1, x: 1, y: 0 }
    ];
    
    let foundTiles = 0;
    const layerId = (layer as any).layerId;
    
    for (const coord of testCoords) {
      const testUrl = `${this.TILE_SERVER_URL}/tiles/${layerId}/${coord.z}/${coord.x}/${coord.y}.png`;
      const exists = await this.testTileUrl(testUrl);
      if (exists) {
        foundTiles++;
        console.log(`✅ Tile found: ${testUrl}`);
      } else {
        console.log(`❌ Tile missing: ${testUrl}`);
      }
    }
    
    if (foundTiles === 0) {
      console.error('🚨 No tiles found! Check tile server and file structure.');
    } else {
      console.log(`📊 Found ${foundTiles}/${testCoords.length} test tiles`);
    }
  }

  /**
   * Test if a tile URL is accessible
   */
  private async testTileUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get selected water stress layer name
   */
  getSelectedWaterStressLayerName(): string {
    if (!this.selectedWaterStressLayer) return 'اختر طبقة الإجهاد المائي';
    const layer = this.layerMetadata[this.selectedWaterStressLayer];
    return layer ? layer.nameAr : 'اختر طبقة الإجهاد المائي';
  }

  /**
   * Clear all water stress layers
   */
  clearWaterStressLayers(): void {
    this.waterStressXYZLayers.forEach(layer => {
      layer.visible = false;
    });
    this.currentWaterStressLayer = null;
    this.selectedWaterStressLayer = '';
  }

  /**
   * Check server status
   */
  async checkServerStatus(): Promise<void> {
    const isHealthy = await this.checkTileServerHealth();
    if (isHealthy) {
      console.log('✅ Tile server is accessible');
      
      // Test both layers
      for (const layer of this.availableLayers) {
        const testUrl = `${this.TILE_SERVER_URL}/tiles/${layer.id}/0/0/0.png`;
        const tileExists = await this.testTileUrl(testUrl);
        if (tileExists) {
          console.log(`✅ ${layer.nameAr} tiles accessible`);
        } else {
          console.warn(`⚠️ ${layer.nameAr} tiles not found at: ${testUrl}`);
        }
      }
    } else {
      console.error('❌ Tile server not accessible on port 3333');
    }
  }

  /**
   * Test all layers
   */
  async testAllLayers(): Promise<void> {
    console.log('🧪 Testing all layers...');
    
    for (const layerConfig of this.availableLayers) {
      console.log(`\n🔍 Testing: ${layerConfig.nameAr}`);
      
      const testCoords = [{ z: 0, x: 0, y: 0 }, { z: 1, x: 0, y: 0 }];
      let foundTiles = 0;
      
      for (const coord of testCoords) {
        const testUrl = layerConfig.tilePath
          .replace('{z}', coord.z.toString())
          .replace('{x}', coord.x.toString())
          .replace('{y}', coord.y.toString());
        
        const exists = await this.testTileUrl(testUrl);
        if (exists) {
          foundTiles++;
          console.log(`  ✅ ${testUrl}`);
        } else {
          console.log(`  ❌ ${testUrl}`);
        }
      }
      
      console.log(`  📊 Result: ${foundTiles}/${testCoords.length} tiles found`);
    }
  }

  // UI Event Handlers
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleMoreInfo(): void {
    this.showMoreInfo = !this.showMoreInfo;
  }

  onRiskTypeChange(riskType: string): void {
    this.selectedRiskType = riskType;
    
    const riskTypeMapping: { [key: string]: string } = {
      'مخاطر الحوض المادية': 'annual_water_stress',
      'مخاطر الجفاف': 'annual_water_stress',
      'مخاطر الفيضانات': 'riverine_flood_risk',
      'جودة المياه': 'annual_water_stress'
    };
    
    const suggestedLayerId = riskTypeMapping[riskType];
    if (suggestedLayerId && this.layerMetadata[suggestedLayerId]) {
      this.selectWaterStressLayer(suggestedLayerId);
    }
  }

  onTransparencyChange(event: any): void {
    this.transparencyValue = event.target.value;
    if (this.currentWaterStressLayer) {
      this.currentWaterStressLayer.opacity = this.transparencyValue / 100;
    }
    if (this.populationDensityLayer) {
      (this.populationDensityLayer as any).opacity = this.transparencyValue / 100;
    }
  }

  goBack(): void {
    this.router.navigate(['/tabbed-category']);
  }

  // Basemap methods
  changeBasemap(direction: 'next' | 'previous'): void {
    if (direction === 'next') {
      this.currentBasemapIndex = (this.currentBasemapIndex + 1) % this.basemaps.length;
    } else {
      this.currentBasemapIndex = this.currentBasemapIndex === 0 
        ? this.basemaps.length - 1 
        : this.currentBasemapIndex - 1;
    }
    this.applyBasemap();
  }

  setBasemap(basemapId: string): void {
    const index = this.basemaps.indexOf(basemapId);
    if (index !== -1) {
      this.currentBasemapIndex = index;
      this.applyBasemap();
    }
  }

  getCurrentBasemapName(): string {
    return this.basemaps[this.currentBasemapIndex];
  }

  getAvailableBasemaps(): string[] {
    return this.basemaps;
  }

  getBasemapDisplayName(basemapId: string): string {
    const displayNames: { [key: string]: string } = {
      'streets-vector': 'خريطة الشوارع مع أسماء المدن',
      'streets-navigation-vector': 'خريطة الشوارع',
      'satellite': 'صور فضائية',
      'hybrid': 'خريطة مختلطة',
      'terrain': 'خريطة التضاريس',
      'oceans': 'خريطة المحيطات',
      'dark-gray-vector': 'خريطة رمادية داكنة',
      'light-gray-vector': 'خريطة رمادية فاتحة',
      'topo-vector': 'خريطة طبوغرافية'
    };
    return displayNames[basemapId] || basemapId;
  }

  toggleBasemapSelector(): void {
    this.showBasemapSelector = !this.showBasemapSelector;
  }

  refreshMap(): void {
    if (this.mapView) {
      this.mapView.goTo({
        center: [45.0792, 23.8859],
        zoom: 6
      });
    }
  }

  private applyBasemap(): void {
    if (this.map) {
      this.map.basemap = this.basemaps[this.currentBasemapIndex];
    }
  }

  // Additional info methods
  getAdditionalInfoOptions(): Array<{id: string, name: string}> {
    return [
      { id: 'population-density', name: 'كثافة السكان' },
      { id: 'water-resources', name: 'الموارد المائية' },
      { id: 'climate-data', name: 'البيانات المناخية' },
      { id: 'land-use', name: 'استخدام الأراضي' }
    ];
  }

  toggleAdditionalInfoDropdown(): void {
    this.showAdditionalInfoDropdown = !this.showAdditionalInfoDropdown;
  }

  selectAdditionalInfo(optionId: string): void {
    this.selectedAdditionalInfo = optionId;
    this.showAdditionalInfoDropdown = false;
    
    if (optionId === 'population-density') {
      this.addPopulationDensityLayer();
    } else {
      this.removePopulationDensityLayer();
    }
  }

  getSelectedAdditionalInfoName(): string {
    if (!this.selectedAdditionalInfo) return 'اختر المعلومات الإضافية';
    const option = this.getAdditionalInfoOptions().find(opt => opt.id === this.selectedAdditionalInfo);
    return option ? option.name : 'اختر المعلومات الإضافية';
  }

  private addPopulationDensityLayer(): void {
    if (!this.map) return;
    this.removePopulationDensityLayer();

    const populationData = [
      { name: 'الرياض', density: 'High', population: '7.6M', coordinates: [46.6753, 24.7136] },
      { name: 'جدة', density: 'High', population: '4.2M', coordinates: [39.2433, 21.5433] },
      { name: 'مكة المكرمة', density: 'Medium', population: '2.0M', coordinates: [39.8579, 21.4225] },
      { name: 'المدينة المنورة', density: 'Medium', population: '1.5M', coordinates: [39.6086, 24.5247] },
      { name: 'الدمام', density: 'Medium', population: '1.5M', coordinates: [50.1033, 26.4207] },
      { name: 'الطائف', density: 'Low', population: '1.2M', coordinates: [40.4154, 21.2703] }
    ];

    const graphics = populationData.map(city => {
      const point = new Point({
        longitude: city.coordinates[0],
        latitude: city.coordinates[1]
      });

      let color: string;
      switch (city.density) {
        case 'High': color = '#d73027'; break;
        case 'Medium': color = '#fc8d59'; break;
        case 'Low': color = '#fee08b'; break;
        default: color = '#e6f598';
      }

      const symbol = new SimpleMarkerSymbol({
        style: 'circle',
        size: 12,
        color: color,
        outline: { color: 'white', width: 2 }
      });

      return new Graphic({
        geometry: point,
        symbol: symbol,
        attributes: {
          name: city.name,
          density: city.density,
          population: city.population
        },
        popupTemplate: {
          title: '{name}',
          content: [{
            type: 'fields',
            fieldInfos: [
              { fieldName: 'density', label: 'كثافة السكان' },
              { fieldName: 'population', label: 'عدد السكان' }
            ]
          }]
        }
      });
    });

    const graphicsLayer = new GraphicsLayer({
      title: 'كثافة السكان',
      graphics: graphics
    });

    this.populationDensityLayer = graphicsLayer;
    this.map.add(graphicsLayer);
  }

  private removePopulationDensityLayer(): void {
    if (this.map && this.populationDensityLayer) {
      this.map.remove(this.populationDensityLayer);
      this.populationDensityLayer = null;
    }
  }
}