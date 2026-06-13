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
});
