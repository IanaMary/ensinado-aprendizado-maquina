import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { PreProcessamentoComponent } from './pre-processamento.component';

describe('PreProcessamentoComponent', () => {
  let component: PreProcessamentoComponent;
  let fixture: ComponentFixture<PreProcessamentoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PreProcessamentoComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(PreProcessamentoComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(PreProcessamentoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
