import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabbedCategory } from './tabbed-category';

describe('TabbedCategory', () => {
  let component: TabbedCategory;
  let fixture: ComponentFixture<TabbedCategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabbedCategory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabbedCategory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
