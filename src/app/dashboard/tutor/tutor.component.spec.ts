import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TutorComponent } from './tutor.component';

describe('TutorComponent', () => {
  let component: TutorComponent;
  let fixture: ComponentFixture<TutorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TutorComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(TutorComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(TutorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should simplify technical terms in basic mode', () => {
    component.contexto = {
      titulo: 'Teste',
      descricao: 'O target usa features para evitar overfitting.',
    };

    expect(component.getExplicacaoBasica()).toBe(
      'o que queremos prever usa pistas para evitar quando o modelo decora os exemplos.'
    );
  });
});
