import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Particles } from './particles';

describe('Particles', () => {
  let component: Particles;
  let fixture: ComponentFixture<Particles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Particles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Particles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
