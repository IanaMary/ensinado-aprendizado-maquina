import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreinoValidacaoTesteComponent } from './treino-validacao-teste.component';

describe('TreinoValidacaoTesteComponent', () => {
  let component: TreinoValidacaoTesteComponent;
  let fixture: ComponentFixture<TreinoValidacaoTesteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreinoValidacaoTesteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreinoValidacaoTesteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
