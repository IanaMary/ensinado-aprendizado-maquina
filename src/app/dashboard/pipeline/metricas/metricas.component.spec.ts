import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetricasComponent } from './metricas.component';

describe('MetricasComponent', () => {
  let component: MetricasComponent;
  let fixture: ComponentFixture<MetricasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetricasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
