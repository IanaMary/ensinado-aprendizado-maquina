import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TreinoValidacaoTesteComponent } from './treino-validacao-teste.component';

describe('TreinoValidacaoTesteComponent', () => {
  let component: TreinoValidacaoTesteComponent;
  let fixture: ComponentFixture<TreinoValidacaoTesteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TreinoValidacaoTesteComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(TreinoValidacaoTesteComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(TreinoValidacaoTesteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
