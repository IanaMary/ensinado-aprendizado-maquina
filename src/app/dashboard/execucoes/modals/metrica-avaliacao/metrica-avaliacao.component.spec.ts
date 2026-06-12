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

  it('should split scalar metrics from yellowbrick visualizations', () => {
    component.resultadosDasAvaliacoes = {
      Acurácia: { KNN: 0.95 },
      _visualizacoes: {
        KNN: [{ titulo: 'Matriz de confusão', mime: 'image/png', base64: 'abc123' }]
      }
    };

    component.atualizarVariaveis();

    expect(component.metricsAvaliadas).toEqual(['Acurácia']);
    expect(component.getModelosComVisualizacoes()).toEqual(['KNN']);
    expect(component.getImagemVisualizacao(component.visualizacoesYellowbrick['KNN'][0]))
      .toBe('data:image/png;base64,abc123');
  });

  it('should generate a student report from evaluation state', () => {
    component.resultadoColetaDado = {
      target: 'fruit',
      preverCategoria: true,
      dadosRotulados: true,
      colunas: ['mass', 'fruit'],
      colunasDetalhes: [],
      porcentagemTreino: 70,
      tipoTarget: 'Texto',
      atributos: { mass: true, fruit: false },
      tipos: {},
      treino: { dados: [], totalDados: 0, nomeArquivo: 'frutas.csv' },
      teste: { dados: [], totalDados: 0 },
      nomeDataset: 'Frutas'
    };
    component.modeloSelecionado = { label: 'Árvore de Decisão' } as any;
    component.resultadosDasAvaliacoes = { Acurácia: { 'Árvore de Decisão': 0.9 } };
    component.atualizarVariaveis();

    const relatorio = component.gerarRelatorioAluno();

    expect(relatorio).toContain('Relatório do experimento');
    expect(relatorio).toContain('Frutas');
    expect(relatorio).toContain('Árvore de Decisão');
    expect(relatorio).toContain('Acurácia');
  });
});
