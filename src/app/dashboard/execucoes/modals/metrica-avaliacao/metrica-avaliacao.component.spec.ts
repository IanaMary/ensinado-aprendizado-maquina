import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { MetricaAvaliacaoComponent } from './metrica-avaliacao.component';

describe('MetricaAvaliacaoComponent', () => {
  let component: MetricaAvaliacaoComponent;
  let fixture: ComponentFixture<MetricaAvaliacaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MetricaAvaliacaoComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(MetricaAvaliacaoComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(MetricaAvaliacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
