import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { ExecucoesComponent } from './execucoes.component';
import { AuthService } from '../../service/auth/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { TurmaService } from '../../service/turma.service';
import { NotificacaoService } from '../../service/notificacao.service';

describe('ExecucoesComponent', () => {
  let component: ExecucoesComponent;
  let fixture: ComponentFixture<ExecucoesComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let itensSubject: Subject<any[]>;
  let dashboardStub: any;
  let turmaStub: any;
  let notificacaoStub: jasmine.SpyObj<NotificacaoService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['getUsuarioRole', 'logout']);
    authService.getUsuarioRole.and.returnValue('admin');
    router = jasmine.createSpyObj('Router', ['navigate']);

    itensSubject = new Subject<any[]>();
    dashboardStub = {
      getItemsEmExecucao: () => itensSubject.asObservable(),
      proximaEtapaPipe$: new Subject<any>(),
      infoItemClicked$: new Subject<any>(),
      resultadoDataset$: new Subject<any>(),
      getTutor: jasmine.createSpy('getTutor').and.returnValue(of({ descricao: 'ola' })),
      moverItensEmExecucao: jasmine.createSpy('moverItensEmExecucao'),
      sincronizarPreProcessamentosSelecionados: jasmine.createSpy('sincronizarPreProcessamentosSelecionados'),
      movendoItemExecucao: jasmine.createSpy('movendoItemExecucao'),
      limparItensExecucao: jasmine.createSpy('limparItensExecucao'),
      // Catálogo lateral de Coleta: `agruparItensColeta` sempre devolve UM item ('dados').
      getItensColetasDados: jasmine.createSpy('getItensColetasDados').and.returnValue(
        of([{ label: 'Dados', valor: 'dados', tipoItem: 'coleta-dado', habilitado: true, movido: false }])
      ),
    };

    notificacaoStub = jasmine.createSpyObj('NotificacaoService', ['sucesso', 'erro', 'aviso']);

    turmaStub = {
      // Um desafio já tentado e um pendente: só o pendente deve virar aviso.
      meusDesafios: jasmine.createSpy('meusDesafios').and.returnValue(of([
        { atividade_id: 'a1', titulo: 'Feito', turma_id: 't1', tentativas: 2, melhor_nota: 9.4 },
        { atividade_id: 'a2', titulo: 'Pendente', turma_id: 't1', tentativas: 0, melhor_nota: null },
      ])),
    };

    await TestBed.configureTestingModule({
      declarations: [ExecucoesComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open'), closeAll: jasmine.createSpy('closeAll') } },
        { provide: AuthService, useValue: authService },
        { provide: DashboardService, useValue: dashboardStub },
        { provide: TurmaService, useValue: turmaStub },
        { provide: NotificacaoService, useValue: notificacaoStub },
      ],
    })
    .overrideComponent(ExecucoesComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(ExecucoesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update columns while alive', () => {
    itensSubject.next([
      { tipoItem: 'coleta-dado', movido: false },
      { tipoItem: 'metrica', movido: true },
    ] as any[]);

    expect(component.itens.length).toBe(2);
    expect(component.colunaColeta.length).toBe(1);
    expect(component.metricasSelecionadas.length).toBe(1);
  });

  it('should unsubscribe from execution items on destroy', () => {
    // Regressão: subscriptions sem takeUntil vazavam após a destruição do componente
    component.ngOnDestroy();

    itensSubject.next([{ tipoItem: 'coleta-dado', movido: false }] as any[]);

    expect(component.itens.length).toBe(0);
  });

  // O menu do usuário agora é o componente compartilhado <app-user-menu>
  // (coberto por user-menu.component.spec); os testes do menu inline saíram daqui.

  it('avisa apenas dos desafios que o aluno ainda não tentou', () => {
    expect(turmaStub.meusDesafios).toHaveBeenCalled();
    expect(component.desafiosPendentes.length).toBe(1);
    expect(component.desafiosPendentes[0].titulo).toBe('Pendente');
  });

  it('abre direto o desafio quando há apenas um pendente', () => {
    component.abrirDesafios();
    expect(router.navigate).toHaveBeenCalledWith(['/desafio'],
      { queryParams: { atividade: 'a2', turma: 't1' } });
  });

  it('com vários desafios pendentes, leva à lista de turmas', () => {
    component.desafiosPendentes = [
      { atividade_id: 'a2', titulo: 'P1', turma_id: 't1', tentativas: 0, melhor_nota: null },
      { atividade_id: 'a3', titulo: 'P2', turma_id: 't1', tentativas: 0, melhor_nota: null },
    ] as any;
    component.abrirDesafios();
    expect(router.navigate).toHaveBeenCalledWith(['/view-aluno/entrar']);
  });

  it('should summarize collection settings for a loaded file dataset', () => {
    component.resultadoColetaDado = {
      target: 'fruit_name',
      preverCategoria: true,
      dadosRotulados: true,
      colunas: ['mass', 'fruit_name'],
      colunasDetalhes: [],
      porcentagemTreino: 80,
      embaralharDados: true,
      estratificarDados: true,
      tipoTarget: 'Texto',
      atributos: { mass: true, fruit_name: false },
      tipos: {},
      treino: { dados: [], totalDados: 120, nomeArquivo: 'fruits_original.csv' },
      teste: { dados: [], totalDados: 30, nomeArquivo: '' },
      fonteDados: 'arquivo'
    };

    expect(component.getTituloColeta({ label: 'Dados' } as any)).toBe('fruits_original.csv');
    expect(component.getResumoFonteColeta()).toBe('Arquivo | 150 exemplos');
    expect(component.getResumoDivisaoColeta()).toBe('Treino/Teste: 80%/20%');
  });

  it('should summarize collection settings for toy datasets and explicit test files', () => {
    component.resultadoColetaDado = {
      target: 'target',
      preverCategoria: true,
      dadosRotulados: true,
      colunas: ['x', 'target'],
      colunasDetalhes: [],
      porcentagemTreino: 70,
      embaralharDados: false,
      estratificarDados: false,
      tipoTarget: 'Número',
      atributos: { x: true, target: false },
      tipos: {},
      treino: { dados: [], totalDados: 100, nomeArquivo: 'iris.csv' },
      teste: { dados: [], totalDados: 50, nomeArquivo: 'iris_test.csv' },
      fonteDados: 'dataset',
      nomeDataset: 'Iris'
    };

    expect(component.getTituloColeta({ label: 'Dados' } as any)).toBe('Iris');
    expect(component.getResumoFonteColeta()).toBe('Toy dataset | 150 exemplos');
    expect(component.getResumoDivisaoColeta()).toBe('Treino: 100 | Teste enviado: 50');
  });

  // Imagem 14 da revisão: o atalho "Carregar dados" do aviso de atividade não fazia nada quando
  // a Área de Trabalho estava vazia — que é o caso NORMAL de quem acabou de abrir a atividade.
  describe('atalho de Coleta do aviso de atividade', () => {
    it('espera o catálogo chegar: clique logo após abrir a tela ainda funciona', () => {
      // Reproduz a corrida medida em produção: o BehaviorSubject começa [] e a lista chega depois.
      // Com `take(1)` cru, o primeiro clique pegava o vazio e não fazia NADA.
      const catalogo = new BehaviorSubject<any[]>([]);
      dashboardStub.getItensColetasDados.and.returnValue(catalogo.asObservable());
      const abrir = spyOn(component, 'abrirModalExecucao');
      component.colunaColeta = [];

      component.abrirColetaAtividade();
      expect(abrir).withContext('ainda não: catálogo vazio').not.toHaveBeenCalled();

      catalogo.next([{ label: 'Dados', valor: 'dados', tipoItem: 'coleta-dado' }]);

      expect(abrir).withContext('abre sozinho quando o catálogo chega').toHaveBeenCalled();
      expect(dashboardStub.movendoItemExecucao).toHaveBeenCalled();
    });

    it('com a raia vazia, põe o item na raia e abre o modal', () => {
      const abrir = spyOn(component, 'abrirModalExecucao');
      component.colunaColeta = [];

      component.abrirColetaAtividade();

      expect(dashboardStub.movendoItemExecucao).toHaveBeenCalled();
      const posto = dashboardStub.movendoItemExecucao.calls.mostRecent().args[0];
      expect(posto.valor).toBe('dados');
      expect(posto.movido).withContext('entra na raia como item movido').toBeTrue();
      expect(abrir).toHaveBeenCalled();
    });

    it('com a raia já preenchida, abre direto o card existente e não duplica', () => {
      const existente = { label: 'Dados', valor: 'dados', tipoItem: 'coleta-dado' } as any;
      const abrir = spyOn(component, 'abrirModalExecucao');
      component.colunaColeta = [existente];

      component.abrirColetaAtividade();

      expect(abrir).toHaveBeenCalledWith(existente);
      expect(dashboardStub.movendoItemExecucao).not.toHaveBeenCalled();
    });

    it('catálogo que nunca chega: avisa no teto de tempo, não fica mudo', fakeAsync(() => {
      // Espera indefinidamente seria voltar ao defeito original (clique sem efeito nenhum).
      dashboardStub.getItensColetasDados.and.returnValue(new BehaviorSubject<any[]>([]).asObservable());
      const abrir = spyOn(component, 'abrirModalExecucao');
      component.colunaColeta = [];

      component.abrirColetaAtividade();
      expect(notificacaoStub.aviso).not.toHaveBeenCalled();

      tick(5000);

      expect(abrir).not.toHaveBeenCalled();
      expect(notificacaoStub.aviso).toHaveBeenCalled();
    }));
  });
});
