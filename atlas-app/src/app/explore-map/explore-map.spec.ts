import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExploreMapComponent } from './explore-map';

describe('ExploreMapComponent', () => {
  let component: ExploreMapComponent;
  let fixture: ComponentFixture<ExploreMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExploreMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default active tab as استكشاف', () => {
    expect(component.activeTab).toBe('استكشاف');
  });

  it('should have default selected risk type as مخاطر الحوض المادية', () => {
    expect(component.selectedRiskType).toBe('مخاطر الحوض المادية');
  });

  it('should change active tab when setActiveTab is called', () => {
    component.setActiveTab('خرائط');
    expect(component.activeTab).toBe('خرائط');
  });

  it('should toggle showMoreInfo when toggleMoreInfo is called', () => {
    const initialValue = component.showMoreInfo;
    component.toggleMoreInfo();
    expect(component.showMoreInfo).toBe(!initialValue);
  });

  it('should change selected risk type when onRiskTypeChange is called', () => {
    component.onRiskTypeChange('مخاطر جديدة');
    expect(component.selectedRiskType).toBe('مخاطر جديدة');
  });
});
