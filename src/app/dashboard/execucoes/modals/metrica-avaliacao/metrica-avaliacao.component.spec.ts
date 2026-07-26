import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { MetricaAvaliacaoComponent } from './metrica-avaliacao.component';
import { PipelineService } from '../../../../service/pipeline.service';

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

  it('should open and close yellowbrick visualization zoom', () => {
    const visualizacao = { titulo: 'Matriz de confusão', mime: 'image/png', base64: 'abc123' };

    component.abrirZoomVisualizacao(visualizacao, 'KNN');

    expect(component.visualizacaoAmpliada).toEqual({ ...visualizacao, modelo: 'KNN' });

    component.fecharZoomVisualizacao();

    expect(component.visualizacaoAmpliada).toBeNull();
  });

  it('should open and close yellowbrick visualization tips without triggering parent click', () => {
    const event = jasmine.createSpyObj<Event>('event', ['stopPropagation']);
    const visualizacao = { titulo: 'Relatório de classificação' };

    component.abrirDicaVisualizacao(event, visualizacao, 'KNN');

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.dicaVisualizacao?.titulo).toBe('Relatório de classificação');
    expect(component.dicaVisualizacao?.modelo).toBe('KNN');
    // Sem conteúdo no DB, cai no fallback: o card mostra a descrição hardcoded.
    expect(component.graficoItemInfoAtual?.descricao).toContain('precision');

    component.fecharDicaVisualizacao();

    expect(component.dicaVisualizacao).toBeNull();
    expect(component.graficoItemInfoAtual).toBeNull();
  });

  // ------------------------------------------------- evolução do aluno nesta base
  describe('evolução nesta base', () => {
    function comHistorico(extra: Partial<any> = {}) {
      component.evolucaoBase = {
        dataset: 'titanic.csv', alvo: 'Survived', tarefa: 'classificacao',
        metrica: 'accuracy_score', ordem: 'desc', baseline: 0.6,
        melhor: 0.72, ultima: 0.72, delta_vs_anterior: null, delta_vs_baseline: 0.12,
        tentativas: [], ...extra,
      } as any;
    }

    it('lê a métrica principal da avaliação aberta, pegando o melhor modelo', () => {
      comHistorico();
      component.resultadosDasAvaliacoes = { 'Acurácia': { KNN: 0.78, Árvore: 0.74 } };
      expect(component.valorAtual).toBe(0.78);
    });

    it('compara com a melhor anterior e com o chute burro, em pontos percentuais', () => {
      comHistorico();
      component.resultadosDasAvaliacoes = { 'Acurácia': { KNN: 0.78 } };
      expect(component.ganhoVsAnterior).toBeCloseTo(0.06, 5);
      expect(component.ganhoVsChuteBurro).toBeCloseTo(0.18, 5);
      expect(component.formatarGanho(component.ganhoVsAnterior)).toBe('+6.0pp');
    });

    it('mostra queda quando a avaliação piora', () => {
      comHistorico();
      component.resultadosDasAvaliacoes = { 'Acurácia': { KNN: 0.65 } };
      expect(component.ganhoVsAnterior).toBeCloseTo(-0.07, 5);
      expect(component.formatarGanho(component.ganhoVsAnterior)).toBe('-7.0pp');
    });

    it('em métrica de menor-é-melhor, cair é ganho positivo e o valor é o menor modelo', () => {
      comHistorico({ metrica: 'mean_absolute_error', ordem: 'asc', baseline: null, melhor: 12 });
      component.resultadosDasAvaliacoes = { 'Erro Absoluto Médio (MAE)': { RL: 8, Ridge: 9 } };
      expect(component.valorAtual).toBe(8);
      expect(component.ganhoVsAnterior).toBeCloseTo(4, 5);
      expect(component.formatarGanho(component.ganhoVsAnterior)).toBe('+4.0');  // sem "pp"
      expect(component.ganhoVsChuteBurro).toBeNull();                            // sem baseline
    });

    it('sem histórico da base, não calcula nada (a seção não aparece)', () => {
      component.evolucaoBase = null;
      component.resultadosDasAvaliacoes = { 'Acurácia': { KNN: 0.9 } };
      expect(component.valorAtual).toBeNull();
      expect(component.ganhoVsAnterior).toBeNull();
    });

    it('busca a evolução quando a coleta chega, não só no init', () => {
      // Regressão: o modal é criado no início do assistente, quando `resultadoColetaDado`
      // ainda é undefined — buscar só no ngOnInit deixava o bloco sempre vazio.
      const service = TestBed.inject(PipelineService);
      const spy = spyOn(service, 'evolucao').and.returnValue(of({ bases: [] }));

      component.ngOnChanges({ resultadoColetaDado: { currentValue: undefined } as any });
      expect(spy).not.toHaveBeenCalled();          // sem dados, não há o que buscar

      component.resultadoColetaDado = { nomeDataset: 'Iris', target: 'target' } as any;
      component.ngOnChanges({ resultadoColetaDado: { currentValue: {} } as any });
      expect(spy).toHaveBeenCalledTimes(1);

      component.ngOnChanges({ resultadoColetaDado: { currentValue: {} } as any });
      expect(spy).toHaveBeenCalledTimes(1);        // mesma base: não refaz a chamada
    });

    it('ignora valores não numéricos vindos da avaliação', () => {
      comHistorico();
      component.resultadosDasAvaliacoes = { 'Acurácia': { KNN: 'Erro: x', Árvore: 0.71 } };
      expect(component.valorAtual).toBe(0.71);
    });
  });
});
