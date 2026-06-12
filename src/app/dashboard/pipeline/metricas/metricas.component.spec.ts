import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { MetricasComponent } from './metricas.component';

describe('MetricasComponent', () => {
  let component: MetricasComponent;
  let fixture: ComponentFixture<MetricasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetricasComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(MetricasComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(MetricasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
