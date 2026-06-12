import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { SelecaoMetricasComponent } from './selecao-metricas.component';

describe('SelecaoMetricasComponent', () => {
  let component: SelecaoMetricasComponent;
  let fixture: ComponentFixture<SelecaoMetricasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelecaoMetricasComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(SelecaoMetricasComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(SelecaoMetricasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
