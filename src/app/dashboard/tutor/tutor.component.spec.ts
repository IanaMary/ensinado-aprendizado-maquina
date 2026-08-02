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
  // Fonte ÚNICA de conteúdo (Imagens 7 e 8 da revisão): antes o painel montava um contexto
  // paralelo a partir de constants/tutor.json, que repetia o que o catálogo do banco já diz.
  describe('fonte única de conteúdo', () => {
    const item = {
      valor: 'adaboost',
      label: 'AdaBoost',
      conteudo: {
        titulo: 'AdaBoost',
        descricao: 'Treina modelos fracos em sequência.',
        intuicao: 'É como estudar focando nos erros.',
        quandoUsar: ['Modelos simples com desempenho fraco'],
      },
    };

    it('deriva a ficha do `conteudo` do modelo escolhido', () => {
      component.modeloSelecionado = item;
      component.ngOnChanges({ modeloSelecionado: { currentValue: item } } as any);

      expect(component.infoExibida?.titulo).toBe('AdaBoost');
      expect(component.infoExibida?.intuicao).toBe('É como estudar focando nos erros.');
    });

    it('o que o pai passa tem precedência sobre o derivado', () => {
      component.modeloSelecionado = item;
      component.ngOnChanges({ modeloSelecionado: { currentValue: item } } as any);
      component.tutorItemInfo = { titulo: 'Veio do pai', descricao: '' };

      expect(component.infoExibida?.titulo).toBe('Veio do pai');
    });

    it('item sem `conteudo` não vira ficha (nada de stub)', () => {
      const cru = { valor: 'x', label: 'X' };
      component.modeloSelecionado = cru;
      component.ngOnChanges({ modeloSelecionado: { currentValue: cru } } as any);

      expect(component.infoExibida).toBeNull();
    });

    it('a métrica só entra quando não há modelo escolhido', () => {
      const metrica = { valor: 'accuracy_score', label: 'Acurácia', conteudo: { titulo: 'Acurácia' } };
      component.modeloSelecionado = item;
      component.metricaSelecionada = metrica;
      component.ngOnChanges({ metricaSelecionada: { currentValue: metrica } } as any);

      expect(component.infoExibida).toBeNull();  // modelo presente: a métrica não sobrescreve
    });

    it('"Voltar ao início" limpa a ficha derivada', () => {
      component.modeloSelecionado = item;
      component.ngOnChanges({ modeloSelecionado: { currentValue: item } } as any);
      component.irParaInicio();

      expect(component.infoExibida).toBeNull();
    });

    // O bloco "Em palavras simples" não pode repetir a intuição, que aparece no card logo abaixo.
    it('a explicação básica não usa a intuição do item', () => {
      component.modeloSelecionado = item;
      component.ngOnChanges({ modeloSelecionado: { currentValue: item } } as any);

      expect(component.getExplicacaoBasica()).toBe('');
      expect(component.getTituloBasico()).toBe('Em palavras simples');
    });
  });
});
