import { TestBed } from '@angular/core/testing';

import { WaterStressTile } from './water-stress-tile';

describe('WaterStressTile', () => {
  let service: WaterStressTile;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WaterStressTile);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
