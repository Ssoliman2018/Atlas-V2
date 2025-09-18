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
  legend?: {
    items: Array<{
      color: string;
      label: string;
      labelAr: string;
      value?: string;
    }>;
  };
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
  selectedRiskType: string = ''; // Changed to empty initially
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
  public selectedLayerInfo: WaterStressXYZLayer | null = null;
  public showLayerDescription: boolean = false;
  
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

  // Water stress XYZ tile layers configuration - Updated with new layer and legends
 private waterStressXYZData: WaterStressXYZLayer[] = [
  {
    id: 'annual_water_stress',
    name: 'Annual Water Stress',
    nameAr: 'الإجهاد المائي السنوي',
    description: 'Annual water stress levels across Saudi Arabia showing water scarcity and availability patterns',
    descriptionAr: 'يُظهر مستويات الإجهاد المائي السنوي في جميع أنحاء المملكة العربية السعودية، ويشمل تحليل ندرة المياه وأنماط التوفر المائي. يقيس هذا المؤشر نسبة استهلاك المياه إلى إجمالي المياه المتجددة المتاحة، ويساعد في تحديد المناطق التي تواجه ضغطاً مائياً عالياً والمناطق التي تتمتع بوفرة مائية نسبية. البيانات ضرورية لوضع استراتيجيات إدارة الموارد المائية المستدامة.',
    tilePath: `${this.TILE_SERVER_URL}/tiles/annual_water_stress/{z}/{x}/{y}.png`,
    localPath: 'D:/Projects/evara/Water Stress/Water Stress',
    opacity: 0.7,
    minZoom: 0,
    maxZoom: 18,
    visible: false,
    legend: {
      items: [
        { color: '#d73027', label: 'Extremely High (>80%)', labelAr: 'عالي جداً (>80%)', value: '>80%' },
        { color: '#f46d43', label: 'High (40-80%)', labelAr: 'عالي (40-80%)', value: '40-80%' },
        { color: '#fdae61', label: 'Medium (20-40%)', labelAr: 'متوسط (20-40%)', value: '20-40%' },
        { color: '#fee08b', label: 'Low-Medium (10-20%)', labelAr: 'منخفض-متوسط (10-20%)', value: '10-20%' },
        { color: '#e6f598', label: 'Low (<10%)', labelAr: 'منخفض (<10%)', value: '<10%' }
      ]
    },
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
    description: 'Riverine flood risk assessment showing areas prone to river flooding and overflow',
    descriptionAr: 'تقييم شامل لمخاطر الفيضانات النهرية يُظهر المناطق المعرضة للفيضانات من الأنهار والأودية. يشمل التحليل المناطق المعرضة لفيض الأنهار الموسمية والدائمة، ويأخذ في الاعتبار التضاريس وأنماط الهطول المطري والبنية التحتية للتحكم في المياه. هذه البيانات حيوية لتخطيط المدن وإدارة مخاطر الكوارث الطبيعية وحماية المجتمعات والممتلكات من أضرار الفيضانات.',
    tilePath: `${this.TILE_SERVER_URL}/tiles/riverine_flood_risk/{z}/{x}/{y}.png`,
    localPath: 'D:/Projects/evara/Riverine flood risk/Riverine flood risk',
    opacity: 0.7,
    minZoom: 0,
    maxZoom: 18,
    visible: false,
    legend: {
      items: [
        { color: '#800026', label: 'Very High Risk', labelAr: 'مخاطر عالية جداً' },
        { color: '#bd0026', label: 'High Risk', labelAr: 'مخاطر عالية' },
        { color: '#e31a1c', label: 'Medium Risk', labelAr: 'مخاطر متوسطة' },
        { color: '#fc4e2a', label: 'Low-Medium Risk', labelAr: 'مخاطر منخفضة-متوسطة' },
        { color: '#feb24c', label: 'Low Risk', labelAr: 'مخاطر منخفضة' }
      ]
    },
    extent: {
      xmin: 34.5,
      ymin: 16.0,
      xmax: 55.5,
      ymax: 32.5
    }
  },
  {
    id: 'coastal_flood_risk',
    name: 'Coastal Flood Risk',
    nameAr: 'مخاطر الفيضانات الساحلية',
    description: 'Coastal flood risk assessment showing areas vulnerable to sea level rise and storm surge flooding',
    descriptionAr: 'تقييم مخاطر الفيضانات الساحلية يُظهر المناطق المعرضة لارتفاع مستوى سطح البحر وفيضانات العواصف البحرية. يشمل التحليل تأثير التغيرات المناخية على المناطق الساحلية، والعواصف الاستوائية، والمد والجزر الاستثنائي. هذه البيانات أساسية للمدن الساحلية مثل جدة والدمام والجبيل لوضع خطط الحماية الساحلية وإدارة التنمية العمرانية في المناطق المعرضة للخطر وحماية البنية التحتية الحيوية.',
    tilePath: `${this.TILE_SERVER_URL}/tiles/coastal_flood_risk/{z}/{x}/{y}.png`,
    localPath: 'D:/Projects/evara/Coastal flood risk/Coastal flood risk',
    opacity: 0.7,
    minZoom: 0,
    maxZoom: 18,
    visible: false,
    legend: {
      items: [
        { color: '#08519c', label: 'Extreme Risk', labelAr: 'مخاطر شديدة' },
        { color: '#3182bd', label: 'High Risk', labelAr: 'مخاطر عالية' },
        { color: '#6baed6', label: 'Medium Risk', labelAr: 'مخاطر متوسطة' },
        { color: '#9ecae1', label: 'Low Risk', labelAr: 'مخاطر منخفضة' },
        { color: '#c6dbef', label: 'Very Low Risk', labelAr: 'مخاطر منخفضة جداً' }
      ]
    },
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
// ADD these properties to your component class:
public showLayerDropdown: boolean = false;
public selectedLayerId: string = '';
public mapLayers = [
  { id: 'annual_water_stress', name: 'الإجهاد المائي السنوي' },
  { id: 'riverine_flood_risk', name: 'مخاطر الفيضانات النهرية' },
  { id: 'coastal_flood_risk', name: 'مخاطر الفيضانات الساحلية' }
];

// ADD these methods to your component:

/**
 * Toggle layer dropdown visibility
 */
toggleLayerDropdown(): void {
  this.showLayerDropdown = !this.showLayerDropdown;
}

/**
 * Get selected layer name for display
 */
getSelectedLayerName(): string {
  if (!this.selectedLayerId) return 'اختر نوع المخاطر';
  const layer = this.layerMetadata[this.selectedLayerId];
  return layer ? layer.nameAr : 'اختر نوع المخاطر';
}

onTransparencyChange(event: any): void {
  // Get slider value as number
  this.transparencyValue = Number(event.target.value);
  
  // Calculate opacity (slider 0-100 becomes 0.0-1.0)
  const opacity = this.transparencyValue / 100;
  
  console.log(`Slider: ${this.transparencyValue}%, Opacity: ${opacity}`);
  
  // Apply to ALL visible layers immediately
  this.waterStressXYZLayers.forEach(layer => {
    if (layer.visible) {
      layer.opacity = opacity;
      console.log(`Applied opacity ${opacity} to visible layer`);
    }
  });
  
  // Also apply to population density if visible
  if (this.populationDensityLayer && this.populationDensityLayer.visible) {
    this.populationDensityLayer.opacity = opacity;
  }
}

// ALSO update your selectLayer method to ensure layer gets current opacity:
async selectLayer(layerId: string): Promise<void> {
  this.selectedLayerId = layerId;
  this.selectedRiskType = layerId;
  this.showLayerDropdown = false;
  this.selectedLayerInfo = this.layerMetadata[layerId] || null;
  
  // Hide ALL layers first
  this.waterStressXYZLayers.forEach(layer => {
    layer.visible = false;
  });
  
  // Find and show selected layer
  const selectedLayer = this.waterStressXYZLayers.find(layer => 
    (layer as any).layerId === layerId
  );

  if (selectedLayer) {
    if (!selectedLayer.loaded) {
      await selectedLayer.load();
    }
    
    // Show layer with current opacity
    selectedLayer.visible = true;
    selectedLayer.opacity = this.transparencyValue / 100;
    this.currentWaterStressLayer = selectedLayer;
    
    console.log(`Layer ${layerId} visible with opacity ${this.transparencyValue / 100}`);
  }
}


getSelectedLayerTitle(): string {
  if (!this.selectedLayerInfo) return 'مخاطر المياه';
  return this.selectedLayerInfo.nameAr;
}

/**
 * Get selected layer subtitle
 */
getSelectedLayerSubtitle(): string {
  if (!this.selectedLayerInfo) return 'اختر نوع المخاطر لعرض المعلومات';
  return this.selectedLayerInfo.name;
}

/**
 * Get selected layer description
 */
getSelectedLayerDescription(): string {
  if (!this.selectedLayerInfo) {
    return 'تشمل مخاطر الحوض المادية كل من الظروف الطبيعية والأنشطة البشرية في أحواض الأنهار. اختر نوع المخاطر أعلاه لعرض البيانات والمعلومات التفصيلية.';
  }
  return this.selectedLayerInfo.descriptionAr;
}



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
    // const lExpand = new Expand({
    //   view: this.mapView,
    //   content: LegendWedgit,
    //   expanded: false
    // });
    this.mapView.ui.add(llExpand, 'top-right');
//    this.mapView.ui.add(lExpand, 'top-right');
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
   * Get available risk types (layer names)
   */
  getRiskTypeOptions(): Array<{id: string, nameAr: string}> {
    return this.availableLayers.map(layer => ({
      id: layer.id,
      nameAr: layer.nameAr
    }));
  }

  /**
   * Select and display a water stress layer
   */
  async selectWaterStressLayer(layerId: string): Promise<void> {
    console.log(`🎯 Selecting layer: ${layerId}`);
    this.selectedWaterStressLayer = layerId;
    this.selectedRiskType = layerId; // Update risk type selection
    this.showWaterStressDropdown = false;
    
    // Update selected layer info
    this.selectedLayerInfo = this.layerMetadata[layerId] || null;
    this.showLayerDescription = true;
    
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
    if (!this.selectedWaterStressLayer) return 'اختر طبقة البيانات';
    const layer = this.layerMetadata[this.selectedWaterStressLayer];
    return layer ? layer.nameAr : 'اختر طبقة البيانات';
  }

  /**
   * Get selected risk type name
   */
  getSelectedRiskTypeName(): string {
    if (!this.selectedRiskType) return 'اختر نوع المخاطر';
    const layer = this.layerMetadata[this.selectedRiskType];
    return layer ? layer.nameAr : 'اختر نوع المخاطر';
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
    this.selectedRiskType = '';
    this.selectedLayerInfo = null;
    this.showLayerDescription = false;
  }

  /**
   * Toggle layer description visibility
   */
  toggleLayerDescription(): void {
    this.showLayerDescription = !this.showLayerDescription;
  }

  /**
   * Get legend items for current layer
   */
  getCurrentLayerLegend(): Array<{color: string, label: string, labelAr: string, value?: string}> {
    if (!this.selectedLayerInfo || !this.selectedLayerInfo.legend) {
      return [];
    }
    return this.selectedLayerInfo.legend.items;
  }

  /**
   * Check server status
   */
  async checkServerStatus(): Promise<void> {
    const isHealthy = await this.checkTileServerHealth();
    if (isHealthy) {
      console.log('✅ Tile server is accessible');
      
      // Test all layers
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

  /**
   * Updated risk type change handler
   */
  onRiskTypeChange(riskType: string): void {
    this.selectedRiskType = riskType;
    
    // Directly select the layer by its ID
    if (this.layerMetadata[riskType]) {
      this.selectWaterStressLayer(riskType);
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