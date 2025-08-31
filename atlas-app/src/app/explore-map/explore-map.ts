import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import BasemapToggle from '@arcgis/core/widgets/BasemapToggle';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import LayerList from '@arcgis/core/widgets/LayerList';
import Expand from '@arcgis/core/widgets/Expand';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Basemap from '@arcgis/core/Basemap';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol';
import config from '@arcgis/core/config';

@Component({
  selector: 'app-explore-map',
  standalone: true,
  imports: [CommonModule],
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
  private populationDensityLayer: FeatureLayer | null = null;
  public currentBasemapIndex: number = 0;
  public showBasemapSelector: boolean = false;
  public selectedAdditionalInfo: string = '';
  public showAdditionalInfoDropdown: boolean = false;
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

  constructor(private router: Router) { }

  ngOnInit(): void { }

  async ngAfterViewInit(): Promise<void> {
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.initializeMap();
    }, 0);
  }

  private async initializeMap(): Promise<void> {
    try {
      console.log('Starting map initialization...');
      console.log('Map container element:', this.mapViewEl.nativeElement);
      
      // Set default options for Esri - using public basemaps that don't require API key
      // config.apiKey = 'YOUR_ESRI_API_KEY'; // Uncomment and add your API key for premium services

      // Create the map with a basemap that includes city names and labels
      this.map = new Map({
        basemap: 'streets-vector' // Use streets vector basemap with city labels
      });
      console.log('Map created with basemap: streets-vector');

      // Create the map view
      this.mapView = new MapView({
        container: this.mapViewEl.nativeElement,
        map: this.map,
        zoom: 6, // Closer zoom for Saudi Arabia
        center: [45.0792, 23.8859], // Center on Saudi Arabia (longitude, latitude)
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
      console.log('MapView created');

      // Add widgets
      await this.addMapWidgets();

      // Wait for the view to be ready
      await this.mapView.when();
      
      console.log('Map initialized successfully');
      console.log('Map container dimensions:', this.mapViewEl.nativeElement.offsetWidth, 'x', this.mapViewEl.nativeElement.offsetHeight);
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  private async addMapWidgets(): Promise<void> {
    if (!this.mapView) return;

    // Add basemap toggle (using our custom system)
    const basemapToggle = new BasemapToggle({
      view: this.mapView,
      nextBasemap: this.basemaps[(this.currentBasemapIndex + 1) % this.basemaps.length]
    });
    this.mapView.ui.add(basemapToggle, 'top-right');

    // Add basemap gallery
    const basemapGallery = new BasemapGallery({
      view: this.mapView
    });
    const bgExpand = new Expand({
      view: this.mapView,
      content: basemapGallery,
      expanded: false
    });
    this.mapView.ui.add(bgExpand, 'top-right');

    // Add layer list
    const layerList = new LayerList({
      view: this.mapView
    });
    const llExpand = new Expand({
      view: this.mapView,
      content: layerList,
      expanded: false
    });
    this.mapView.ui.add(llExpand, 'top-right');

    // Add water risk layers (commented out to avoid loading errors)
    // await this.addWaterRiskLayers();
  }

  private async addWaterRiskLayers(): Promise<void> {
    if (!this.map) return;

    try {
      // Example water risk layer (you would replace this with your actual data)
      const waterRiskLayer = new FeatureLayer({
        url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0',
        title: 'Water Risk Assessment',
        opacity: 0.8,
        popupTemplate: {
          title: '{NAME}',
          content: 'Water Risk Level: {RISK_LEVEL}'
        }
      });

      // Add the layer to the map
      this.map.add(waterRiskLayer);

      console.log('Water risk layer added successfully');
    } catch (error) {
      console.error('Error adding water risk layer:', error);
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleMoreInfo(): void {
    this.showMoreInfo = !this.showMoreInfo;
  }

  onRiskTypeChange(riskType: string): void {
    this.selectedRiskType = riskType;
  }

  goBack(): void {
    this.router.navigate(['/tabbed-category']);
  }

  onTransparencyChange(event: any): void {
    this.transparencyValue = event.target.value;
    this.updateLayerTransparency();
  }

  private updateLayerTransparency(): void {
    if (this.map && this.map.layers.length > 0) {
      // Update the opacity of the first layer (water risk layer)
      const waterRiskLayer = this.map.layers.getItemAt(0);
      if (waterRiskLayer) {
        waterRiskLayer.opacity = this.transparencyValue / 100;
      }
    }
  }

  // Public method to change basemap
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

  // Public method to set specific basemap
  setBasemap(basemapId: string): void {
    const index = this.basemaps.indexOf(basemapId);
    if (index !== -1) {
      this.currentBasemapIndex = index;
      this.applyBasemap();
    }
  }

  // Get current basemap name
  getCurrentBasemapName(): string {
    return this.basemaps[this.currentBasemapIndex];
  }

  // Get all available basemaps
  getAvailableBasemaps(): string[] {
    return this.basemaps;
  }

  // Get display name for basemap
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

  // Toggle basemap selector
  toggleBasemapSelector(): void {
    this.showBasemapSelector = !this.showBasemapSelector;
  }

  // Refresh map manually
  refreshMap(): void {
    if (this.mapView) {
      this.mapView.goTo({
        center: [45.0792, 23.8859], // Center on Saudi Arabia
        zoom: 6
      });
    }
  }

  // Handle map loading errors
  private handleMapError(error: any): void {
    console.error('Map loading error:', error);
    // You can add user-friendly error handling here
  }

  // Additional info options
  getAdditionalInfoOptions(): Array<{id: string, name: string}> {
    return [
      { id: 'population-density', name: 'كثافة السكان' },
      { id: 'water-resources', name: 'الموارد المائية' },
      { id: 'climate-data', name: 'البيانات المناخية' },
      { id: 'land-use', name: 'استخدام الأراضي' }
    ];
  }

  // Toggle additional info dropdown
  toggleAdditionalInfoDropdown(): void {
    this.showAdditionalInfoDropdown = !this.showAdditionalInfoDropdown;
  }

  // Select additional info option
  selectAdditionalInfo(optionId: string): void {
    this.selectedAdditionalInfo = optionId;
    this.showAdditionalInfoDropdown = false;
    
    if (optionId === 'population-density') {
      this.addPopulationDensityLayer();
    } else {
      this.removePopulationDensityLayer();
    }
  }

  // Get display name for selected additional info
  getSelectedAdditionalInfoName(): string {
    if (!this.selectedAdditionalInfo) return 'اختر المعلومات الإضافية';
    const option = this.getAdditionalInfoOptions().find(opt => opt.id === this.selectedAdditionalInfo);
    return option ? option.name : 'اختر المعلومات الإضافية';
  }

  // Add population density layer with dummy data
  private addPopulationDensityLayer(): void {
    if (!this.map) return;

    // Remove existing layer if any
    this.removePopulationDensityLayer();

    try {
      // Create dummy population density data for Saudi Arabia regions
      const populationDensityData = [
        {
          name: 'الرياض',
          density: 'High',
          population: '7.6M',
          coordinates: [46.6753, 24.7136]
        },
        {
          name: 'جدة',
          density: 'High',
          population: '4.2M',
          coordinates: [39.2433, 21.5433]
        },
        {
          name: 'مكة المكرمة',
          density: 'Medium',
          population: '2.0M',
          coordinates: [39.8579, 21.4225]
        },
        {
          name: 'المدينة المنورة',
          density: 'Medium',
          population: '1.5M',
          coordinates: [39.6086, 24.5247]
        },
        {
          name: 'الدمام',
          density: 'Medium',
          population: '1.5M',
          coordinates: [50.1033, 26.4207]
        },
        {
          name: 'الطائف',
          density: 'Low',
          population: '1.2M',
          coordinates: [40.4154, 21.2703]
        },
        {
          name: 'أبها',
          density: 'Low',
          population: '0.8M',
          coordinates: [42.5053, 18.2164]
        },
        {
          name: 'تبوك',
          density: 'Low',
          population: '0.6M',
          coordinates: [36.5724, 28.3835]
        }
      ];

      // Create graphics for each city
      const graphics = populationDensityData.map(city => {
        const point = new Point({
          longitude: city.coordinates[0],
          latitude: city.coordinates[1]
        });

        // Define symbol based on density
        let color: string;
        
        switch (city.density) {
          case 'High':
            color = '#d73027'; // Red for high density
            break;
          case 'Medium':
            color = '#fc8d59'; // Orange for medium density
            break;
          case 'Low':
            color = '#fee08b'; // Yellow for low density
            break;
          default:
            color = '#e6f598'; // Light green for very low density
        }

        const symbol = new SimpleMarkerSymbol({
          style: 'circle',
          size: 12,
          color: color,
          outline: {
            color: 'white',
            width: 2
          }
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
            content: [
              {
                type: 'fields',
                fieldInfos: [
                  {
                    fieldName: 'density',
                    label: 'كثافة السكان',
                    format: {
                      places: 0
                    }
                  },
                  {
                    fieldName: 'population',
                    label: 'عدد السكان',
                    format: {
                      places: 0
                    }
                  }
                ]
              }
            ]
          }
        });
      });

      // Create a graphics layer
      const graphicsLayer = new GraphicsLayer({
        title: 'كثافة السكان',
        graphics: graphics
      });

      this.populationDensityLayer = graphicsLayer as any;
      this.map.add(graphicsLayer);
      
      console.log('Population density layer added successfully');
    } catch (error) {
      console.error('Error adding population density layer:', error);
    }
  }

  // Remove population density layer
  private removePopulationDensityLayer(): void {
    if (this.map && this.populationDensityLayer) {
      this.map.remove(this.populationDensityLayer);
      this.populationDensityLayer = null;
      console.log('Population density layer removed');
    }
  }

  private applyBasemap(): void {
    if (this.map) {
      this.map.basemap = this.basemaps[this.currentBasemapIndex];
    }
  }
}
