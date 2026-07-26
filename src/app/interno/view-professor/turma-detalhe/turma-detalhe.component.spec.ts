import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { TurmaDetalheComponent } from './turma-detalhe.component';
import { TurmaService } from '../../../service/turma.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';

/**
 * Cobre a montagem do gabarito enviado ao backend: é a única lógica de decisão da tela
 * (quando `pre_processamento` entra em `exige`, e o que vai em fixar/vetar).
 */
describe('TurmaDetalheComponent — desafio de montagem', () => {
  let fixture: ComponentFixture<TurmaDetalheComponent>;
  let comp: TurmaDetalheComponent;
  let turma: jasmine.SpyObj<TurmaService>;
  let dash: any;

  beforeEach(async () => {
    turma = jasmine.createSpyObj('TurmaService', [
      'obterTurma', 'listarAtividades', 'progresso', 'criarAtividade', 'ranking',
    ]);
    turma.obterTurma.and.returnValue(of({ id: 't1', nome: 'Turma', codigo: 'ABC234' } as any));
    turma.listarAtividades.and.returnValue(of([]));
    turma.progresso.and.returnValue(of({ alunos: [] }));
    turma.criarAtividade.and.returnValue(of({ id: 'a1', turma_id: 't1', titulo: 'X' } as any));

    dash = jasmine.createSpyObj('DashboardService', [
      'getToyDatasets', 'carregarItensPreProcessamento', 'carregarItensModelos',
      'carregarItensMetricas', 'getItensPreProcessamento', 'getModelos', 'getItensMetricas',
      'fetchItensColetasDados', 'getPerfilDesafioDataset',
    ]);
    dash.getToyDatasets.and.returnValue(of([
      { id: 'iris', nome: 'Iris', tipo: 'classificacao' },
      { id: 'gen_sorvete', nome: 'Sorvetes 🍦', tipo: 'regressao' },
    ]));
    dash.fetchItensColetasDados.and.returnValue(of([
      { valor: 'arquivo', nome: 'Arquivo', habilitado: true },
    ]));
    dash.getPerfilDesafioDataset.and.returnValue(of({
      dataset: 'iris', nome: 'Iris', tarefa: 'classificacao', n_amostras: 150,
      pergunta: 'Será que medidas simples bastam?', descricao: 'Três espécies de flores.',
      alvo: 'Espécie da flor', atributos: 'Medidas das pétalas',
      enunciado_sugerido: 'Será que medidas simples bastam? Três espécies de flores.',
      dados: { faltantes: false, texto: false, escalas_diferentes: true },
    }));
    dash.getItensPreProcessamento.and.returnValue(of([
      { valor: 'minmax_scaler', label: 'MinMaxScaler', habilitado: true },
    ]));
    dash.getModelos.and.returnValue(of([
      { valor: 'knn', label: 'k-NN', habilitado: true },
      { valor: 'oculto', label: 'Oculto', habilitado: false },
    ]));
    dash.getItensMetricas.and.returnValue(of([
      { valor: 'accuracy_score', label: 'Acurácia', habilitado: true },
    ]));

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [TurmaDetalheComponent],
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: TurmaService, useValue: turma },
        { provide: DashboardService, useValue: dash },
        { provide: MatSnackBar, useValue: { open: () => {} } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 't1' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TurmaDetalheComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  function criarDesafio(extra: Partial<any> = {}) {
    Object.assign(comp.novaAtiv, { tipo: 'montagem', titulo: 'Desafio', dataset: 'iris' }, extra);
    comp.criarAtividade();
    return turma.criarAtividade.calls.mostRecent().args[1] as any;
  }

  it('lista as peças habilitadas do catálogo, com a lane de cada uma', () => {
    expect(comp.pecas.map(p => p.valor).sort())
      .toEqual(['accuracy_score', 'arquivo', 'knn', 'minmax_scaler']);
    expect(comp.pecas.some(p => p.valor === 'oculto')).toBeFalse();  // desabilitada no admin
    expect(comp.pecas.find(p => p.valor === 'knn')?.lane).toBe('modelo');
    expect(comp.pecas.find(p => p.valor === 'arquivo')?.lane).toBe('coleta');
  });

  it('escolher a base define a tarefa, o enunciado e o que a base exige', () => {
    comp.novaAtiv.tipo = 'montagem';
    comp.novaAtiv.dataset = 'iris';
    comp.onDatasetDesafioChange();

    expect(dash.getPerfilDesafioDataset).toHaveBeenCalledWith('iris');
    expect(comp.novaAtiv.tarefa).toBe('classificacao');
    expect(comp.novaAtiv.escalasDiferentes).toBeTrue();       // lido do dataframe
    expect(comp.novaAtiv.faltantes).toBeFalse();
    expect(comp.novaAtiv.descricao).toContain('Três espécies');
    expect(comp.perfil?.nome).toBe('Iris');
  });

  it('não sobrescreve enunciado que o professor já escreveu', () => {
    comp.novaAtiv.descricao = 'Meu enunciado';
    comp.novaAtiv.dataset = 'iris';
    comp.onDatasetDesafioChange();
    expect(comp.novaAtiv.descricao).toBe('Meu enunciado');
  });

  it('só oferece peças compatíveis com a tarefa da base', () => {
    comp.novaAtiv.tarefa = 'classificacao';
    expect(comp.pecasDaLane('modelo').map(p => p.valor)).toEqual(['knn']);
    comp.novaAtiv.tarefa = 'regressao';
    expect(comp.pecasDaLane('modelo')).toEqual([]);           // k-NN é de classificação
    expect(comp.pecasDaLane('coleta').map(p => p.valor)).toEqual(['arquivo']);
  });

  it('desafio exige uma base para poder ser criado', () => {
    Object.assign(comp.novaAtiv, { tipo: 'montagem', titulo: 'Desafio', dataset: '' });
    expect(comp.podeCriarAtividade).toBeFalse();
    comp.novaAtiv.dataset = 'iris';
    expect(comp.podeCriarAtividade).toBeTrue();
  });

  it('manda a base e o modo das peças no gabarito', () => {
    const sorteado = criarDesafio();
    expect(sorteado.gabarito.dataset).toBe('iris');
    expect(sorteado.gabarito.sortear_pecas).toBeTrue();

    const curado = criarDesafio({ modoPecas: 'escolher', fixar: ['knn'] });
    expect(curado.gabarito.sortear_pecas).toBeFalse();
    expect(curado.gabarito.fixar).toEqual(['knn']);
  });

  it('trocar a base descarta as peças escolhidas para a tarefa anterior', () => {
    comp.novaAtiv.fixar = ['knn'];
    comp.novaAtiv.dataset = 'gen_sorvete';
    comp.onDatasetDesafioChange();
    expect(comp.novaAtiv.fixar).toEqual([]);
  });

  it('não exige pré-processamento quando a base não pede nada', () => {
    const corpo = criarDesafio();
    expect(corpo.tipo).toBe('montagem');
    expect(corpo.gabarito.exige).toEqual(['coleta', 'modelo', 'metrica']);
  });

  it('exige pré-processamento quando a base tem faltantes ou texto', () => {
    expect(criarDesafio({ faltantes: true }).gabarito.exige)
      .toEqual(['coleta', 'pre_processamento', 'modelo', 'metrica']);
    expect(criarDesafio({ faltantes: false, texto: true }).gabarito.exige)
      .toContain('pre_processamento');
  });

  it('exige pré-processamento quando o professor marca, mesmo sem faltantes/texto', () => {
    const corpo = criarDesafio({ exigePreProcessamento: true });
    expect(corpo.gabarito.exige).toEqual(['coleta', 'pre_processamento', 'modelo', 'metrica']);
    expect(corpo.gabarito.dados).toEqual({ faltantes: false, texto: false, escalas_diferentes: false });
  });

  it('envia peças escolhidas e vetadas pelo professor', () => {
    const corpo = criarDesafio({ fixar: ['minmax_scaler'], vetar: ['knn'] });
    expect(corpo.gabarito.fixar).toEqual(['minmax_scaler']);
    expect(corpo.gabarito.vetar).toEqual(['knn']);
  });

  it('atividade de pipeline não manda gabarito e mantém o dataset', () => {
    Object.assign(comp.novaAtiv, { tipo: 'pipeline', titulo: 'Pipeline', datasetNome: 'iris' });
    comp.criarAtividade();
    const corpo = turma.criarAtividade.calls.mostRecent().args[1] as any;
    expect(corpo.gabarito).toBeUndefined();
    expect(corpo.template).toEqual({ datasetNome: 'iris' });
  });

  it('limpa o formulário do desafio depois de criar', () => {
    criarDesafio({ faltantes: true, fixar: ['minmax_scaler'] });
    expect(comp.novaAtiv.tipo).toBe('pipeline');
    expect(comp.novaAtiv.faltantes).toBeFalse();
    expect(comp.novaAtiv.fixar).toEqual([]);
    expect(comp.novaAtiv.dataset).toBe('');
    expect(comp.perfil).toBeUndefined();
  });

  it('ranking do desafio é por nota; o de pipeline segue a métrica', () => {
    turma.ranking.and.returnValue(of({ ranking: [], metrica: 'nota' }));
    comp.verRanking({ id: 'a1', turma_id: 't1', titulo: 'D', tipo: 'montagem' } as any);
    expect(comp.rankingMetrica).toBe('nota');

    turma.ranking.and.returnValue(of({ ranking: [], metrica: 'accuracy_score' }));
    comp.verRanking({ id: 'a2', turma_id: 't1', titulo: 'P',
                      criterio: { metrica: 'accuracy_score', ordem: 'desc' } } as any);
    expect(comp.rankingMetrica).toBe('accuracy_score');
  });
  it('formata nota de desafio com 1 casa e métrica com 4', () => {
    turma.ranking.and.returnValue(of({ ranking: [], metrica: 'nota' }));
    comp.verRanking({ id: 'a1', turma_id: 't1', titulo: 'D', tipo: 'montagem' } as any);
    expect(comp.fmtRanking(5.3)).toBe('5.3');          // nota 0–10, não "5.3000"
    expect(comp.fmtRanking(10)).toBe('10.0');

    turma.ranking.and.returnValue(of({ ranking: [], metrica: 'accuracy_score' }));
    comp.verRanking({ id: 'a2', turma_id: 't1', titulo: 'P' } as any);
    expect(comp.fmtRanking(0.7812)).toBe('0.7812');    // métrica mantém 4 casas
  });
});
