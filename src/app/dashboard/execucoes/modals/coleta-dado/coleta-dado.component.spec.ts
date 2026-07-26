import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { Subject, throwError, of } from 'rxjs';

import { ColetaDadoComponent } from './coleta-dado.component';
import { DashboardService } from '../../../services/dashboard.service';
import { NotificacaoService } from '../../../../service/notificacao.service';

describe('ColetaDadoComponent', () => {
  let component: ColetaDadoComponent;
  let fixture: ComponentFixture<ColetaDadoComponent>;
  let dashboardService: jasmine.SpyObj<DashboardService>;
  let notificacao: jasmine.SpyObj<NotificacaoService>;

  beforeEach(async () => {
    dashboardService = jasmine.createSpyObj('DashboardService', [
      'getColetaInfo',
      'putColetaConfig',
      'redividirColeta',
      'getToyDatasets',
      'carregarToyDataset',
    ]);
    notificacao = jasmine.createSpyObj('NotificacaoService', ['sucesso', 'erro', 'aviso']);
    // Widget novo abre na aba Toy Datasets e dispara carregarDatasets() no ngOnInit.
    dashboardService.getToyDatasets.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [ColetaDadoComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
        { provide: DashboardService, useValue: dashboardService },
        { provide: NotificacaoService, useValue: notificacao },
      ],
    })
    .overrideComponent(ColetaDadoComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(ColetaDadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept all grouped data file formats', () => {
    expect(component.aceitarArquivos).toBe('.csv,.tsv,.json,.xls,.xlsx');
  });

  it('should detect file type by extension', () => {
    expect(component.detectarTipoArquivo('dados.csv')).toBe('csv');
    expect(component.detectarTipoArquivo('dados.tsv')).toBe('tsv');
    expect(component.detectarTipoArquivo('dados.json')).toBe('json');
    expect(component.detectarTipoArquivo('dados.xls')).toBe('excel');
    expect(component.detectarTipoArquivo('dados.xlsx')).toBe('excel');
  });

  it('should notify the user when loading collection info fails', () => {
    // Regressão: o handler de erro era vazio e a falha ficava invisível para o aluno
    component.idConfigurcacaoTreinamento = 'config-1';
    dashboardService.getColetaInfo.and.returnValue(
      throwError(() => ({ error: { detail: 'Configuração não encontrada.' } }))
    );

    component.getColetaInfo();

    expect(notificacao.erro).toHaveBeenCalledWith('Configuração não encontrada.');
  });

  it('should notify the user when saving collection config fails', () => {
    component.idConfigurcacaoTreinamento = 'config-1';
    dashboardService.putColetaConfig.and.returnValue(throwError(() => ({})));

    component.putConfiguracaoTreino();

    expect(notificacao.erro).toHaveBeenCalled();
  });

  describe('redividirDados', () => {
    beforeEach(() => {
      component.idConfigurcacaoTreinamento = 'config-1';
      component.teste.nomeArquivo = '';
    });

    it('should debounce rapid calls into a single request', fakeAsync(() => {
      // Regressão: cada mudança no slider disparava uma requisição concorrente
      const resposta$ = new Subject<any>();
      dashboardService.redividirColeta.and.returnValue(resposta$.asObservable());

      for (let i = 0; i < 5; i++) {
        component.redividirDados();
      }
      tick(300);

      expect(dashboardService.redividirColeta).toHaveBeenCalledTimes(1);
      resposta$.complete();
    }));

    it('should cancel the previous in-flight request when a new one starts', fakeAsync(() => {
      // Regressão: resposta antiga chegava depois e sobrescrevia o estado mais novo
      const primeira$ = new Subject<any>();
      const segunda$ = new Subject<any>();
      dashboardService.redividirColeta.and.returnValues(primeira$.asObservable(), segunda$.asObservable());

      component.redividirDados();
      tick(300);

      component.redividirDados();
      tick(300);

      // A resposta da segunda redivisão chega primeiro
      segunda$.next({ atributos: {}, num_linhas_treino: 222, num_linhas_total: 300 });
      segunda$.complete();

      // A resposta atrasada da primeira não deve sobrescrever o estado
      primeira$.next({ atributos: {}, num_linhas_treino: 111, num_linhas_total: 300 });
      primeira$.complete();

      expect(component.treino.totalDados).toBe(222);
    }));

    it('should surface backend errors without breaking the stream', fakeAsync(() => {
      dashboardService.redividirColeta.and.returnValues(
        throwError(() => ({ error: { detail: 'divisão inválida' } })),
        new Subject<any>().asObservable()
      );

      component.redividirDados();
      tick(300);

      expect(component.treino.erro).toBe('divisão inválida');
      expect(component.redivisaoEmAndamento).toBeFalse();

      // A stream continua viva: uma nova redivisão ainda dispara requisição
      component.redividirDados();
      tick(300);
      expect(dashboardService.redividirColeta).toHaveBeenCalledTimes(2);
    }));
  });
  // ------------------------------------------------- estratificação por padrão
  describe('estratificação', () => {
    beforeEach(() => {
      component.idConfigurcacaoTreinamento = 'cfg1';
      dashboardService.putColetaConfig.and.returnValue(of({}));
      dashboardService.redividirColeta.and.returnValue(of({ atributos: {} }));
    });

    it('liga por padrão ao escolher classificação', () => {
      component.onTipoPredicaoChange('classificacao');
      expect(component.resultColetaDadoL.estratificarDados).toBeTrue();
      expect(component.resultColetaDadoL.preverCategoria).toBeTrue();
    });

    it('não liga em regressão nem em exploratório', () => {
      component.onTipoPredicaoChange('regressao');
      expect(component.resultColetaDadoL.estratificarDados).toBeFalse();

      component.onTipoPredicaoChange('exploratorio');
      expect(component.resultColetaDadoL.estratificarDados).toBeFalse();
    });

    it('desligar embaralhar desliga a estratificação (ela depende do embaralhamento)', () => {
      component.onTipoPredicaoChange('classificacao');
      component.resultColetaDadoL.embaralharDados = false;
      component.onDivisaoDadosChange();
      expect(component.resultColetaDadoL.estratificarDados).toBeFalse();
    });

    it('envia o pedido de estratificação na redivisão', fakeAsync(() => {
      component.onTipoPredicaoChange('classificacao');
      component.resultColetaDadoL.target = 'classe';
      component.redividirDados();
      tick(300);

      const corpo = dashboardService.redividirColeta.calls.mostRecent().args[2] as any;
      expect(corpo.stratify).toBeTrue();
      expect(corpo.target).toBe('classe');
    }));

    it('reflete o que o servidor conseguiu fazer e avisa quando não estratificou', fakeAsync(() => {
      component.onTipoPredicaoChange('classificacao');
      dashboardService.redividirColeta.and.returnValue(of({
        atributos: {}, stratify: false,
        aviso_estratificacao: 'Não foi possível estratificar: alguma categoria tem menos de 2 exemplos.',
      }));

      component.redividirDados();
      tick(300);

      expect(component.resultColetaDadoL.estratificarDados).toBeFalse();
      expect(notificacao.aviso).toHaveBeenCalled();
    }));

    it('dataset de exemplo de classificação já vem estratificado', () => {
      component.processarResultadoDataset({
        dados: [], total_dados: 10, nome_dataset: 'Iris', colunas: ['a', 'target'],
        colunas_detalhes: [{ nome_coluna: 'a', tipo_coluna: 'Número' },
                           { nome_coluna: 'target', tipo_coluna: 'Texto' }],
        target: 'target', prever_categoria: true, dados_rotulados: true, tipo_target: 'Texto',
      });
      expect(component.resultColetaDadoL.estratificarDados).toBeTrue();
    });
    it('desmarca a caixa e avisa quando o servidor não conseguiu estratificar (upload)', () => {
      component.onTipoPredicaoChange('classificacao');
      expect(component.resultColetaDadoL.estratificarDados).toBeTrue();

      // Resposta de qualquer porta de entrada (CSV, XLSX, URL) passa por preencherDados.
      component.preencherDados({
        atributos: { x: true, classe: false }, num_linhas_total: 6,
        stratify: false,
        aviso_estratificacao: 'Não foi possível estratificar: alguma categoria tem menos de 2 exemplos.',
      });

      expect(component.resultColetaDadoL.estratificarDados).toBeFalse();
      expect(notificacao.aviso).toHaveBeenCalledWith(
        'Não foi possível estratificar: alguma categoria tem menos de 2 exemplos.');
    });

    it('não avisa quando a estratificação deu certo', () => {
      component.onTipoPredicaoChange('classificacao');
      component.preencherDados({ atributos: { x: true }, num_linhas_total: 20, stratify: true });
      expect(component.resultColetaDadoL.estratificarDados).toBeTrue();
      expect(notificacao.aviso).not.toHaveBeenCalled();
    });

    it('dataset de exemplo respeita o que o servidor conseguiu fazer', () => {
      component.processarResultadoDataset({
        dados: [], total_dados: 6, nome_dataset: 'Estranho', colunas: ['a', 'target'],
        colunas_detalhes: [{ nome_coluna: 'a', tipo_coluna: 'Número' },
                           { nome_coluna: 'target', tipo_coluna: 'Texto' }],
        target: 'target', prever_categoria: true, dados_rotulados: true, tipo_target: 'Texto',
        stratify: false, aviso_estratificacao: 'Não foi possível estratificar.',
      });
      expect(component.resultColetaDadoL.estratificarDados).toBeFalse();
      expect(notificacao.aviso).toHaveBeenCalledWith('Não foi possível estratificar.');
    });
  });
});
