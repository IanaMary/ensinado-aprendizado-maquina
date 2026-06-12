import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { PreProcessamentoConfigComponent } from './pre-processamento-config.component';

describe('PreProcessamentoConfigComponent', () => {
  let component: PreProcessamentoConfigComponent;
  let fixture: ComponentFixture<PreProcessamentoConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PreProcessamentoConfigComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(PreProcessamentoConfigComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(PreProcessamentoConfigComponent);
    component = fixture.componentInstance;
  });

  it('should recommend preprocessing steps from column types and missing values', () => {
    component.resultadoColetaDado = {
      target: 'fruit',
      preverCategoria: true,
      dadosRotulados: true,
      colunas: ['mass', 'width', 'color', 'fruit'],
      colunasDetalhes: [
        { nome_coluna: 'mass', tipo_coluna: 'Número' },
        { nome_coluna: 'width', tipo_coluna: 'Número' },
        { nome_coluna: 'color', tipo_coluna: 'Texto' },
        { nome_coluna: 'fruit', tipo_coluna: 'Texto' },
      ] as any,
      porcentagemTreino: 70,
      tipoTarget: 'Texto',
      atributos: { mass: true, width: true, color: true, fruit: false },
      tipos: {},
      treino: { dados: [{ mass: 10, width: '', color: 'red', fruit: 'apple' }], totalDados: 1 },
      teste: { dados: [], totalDados: 0 }
    };

    component.carregarColunas();

    const recomendacoes = component.getRecomendacoes().join(' ');
    expect(recomendacoes).toContain('OneHotEncoder');
    expect(recomendacoes).toContain('StandardScaler');
    expect(recomendacoes).toContain('SimpleImputer');
    expect(recomendacoes).toContain('LabelEncoder');
  });
});
