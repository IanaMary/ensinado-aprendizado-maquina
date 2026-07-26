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

  beforeEach(async () => {
    turma = jasmine.createSpyObj('TurmaService', [
      'obterTurma', 'listarAtividades', 'progresso', 'criarAtividade', 'ranking',
    ]);
    turma.obterTurma.and.returnValue(of({ id: 't1', nome: 'Turma', codigo: 'ABC234' } as any));
    turma.listarAtividades.and.returnValue(of([]));
    turma.progresso.and.returnValue(of({ alunos: [] }));
    turma.criarAtividade.and.returnValue(of({ id: 'a1', turma_id: 't1', titulo: 'X' } as any));

    const dash = jasmine.createSpyObj('DashboardService', [
      'getToyDatasets', 'carregarItensPreProcessamento', 'carregarItensModelos',
      'carregarItensMetricas', 'getItensPreProcessamento', 'getModelos', 'getItensMetricas',
    ]);
    dash.getToyDatasets.and.returnValue(of([]));
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
    Object.assign(comp.novaAtiv, { tipo: 'montagem', titulo: 'Desafio' }, extra);
    comp.criarAtividade();
    return turma.criarAtividade.calls.mostRecent().args[1] as any;
  }

  it('lista as peças habilitadas do catálogo para fixar/vetar', () => {
    expect(comp.pecas.map(p => p.valor)).toEqual(['accuracy_score', 'knn', 'minmax_scaler']);
    expect(comp.pecas.some(p => p.valor === 'oculto')).toBeFalse();  // desabilitada no admin
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

  it('envia fixar/vetar escolhidos pelo professor', () => {
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
});
