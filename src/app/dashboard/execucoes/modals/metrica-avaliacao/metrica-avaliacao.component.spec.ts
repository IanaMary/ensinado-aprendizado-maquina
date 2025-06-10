import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetricaAvaliacaoComponent } from './metrica-avaliacao.component';

describe('MetricaAvaliacaoComponent', () => {
  let component: MetricaAvaliacaoComponent;
  let fixture: ComponentFixture<MetricaAvaliacaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricaAvaliacaoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetricaAvaliacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
