import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { environment } from '../../../environments/environment';
import { skip } from 'rxjs';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardService],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTutor', () => {
    it('should call GET tutor endpoint with params', () => {
      const params = 'pipe=inicio';
      service.getTutor(params).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}tutor/?${params}`);
      expect(req.request.method).toBe('GET');
      req.flush({});
    });
  });

  describe('postColetaArquivo', () => {
    it('should call POST csv endpoint', () => {
      const formData = new FormData();
      formData.append('tipo', 'treino');
      formData.append('file', new Blob(['test']), 'test.csv');
      service.postColetaArquivo('csv', formData).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}coleta_dados/csv`);
      expect(req.request.method).toBe('POST');
      req.flush({ id_coleta: '123' });
    });

    it('should call POST xlxs endpoint', () => {
      const formData = new FormData();
      formData.append('tipo', 'treino');
      service.postColetaArquivo('xlxs', formData).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}coleta_dados/salvar_xlxs`);
      expect(req.request.method).toBe('POST');
      req.flush({ id_coleta: '123' });
    });

    it('should call CSV endpoint for TSV files', () => {
      const formData = new FormData();
      formData.append('tipo', 'treino');
      service.postColetaArquivo('tsv', formData).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}coleta_dados/csv`);
      expect(req.request.method).toBe('POST');
      req.flush({ id_coleta: '123' });
    });

    it('should call Excel endpoint for grouped Excel files', () => {
      const formData = new FormData();
      formData.append('tipo', 'treino');
      service.postColetaArquivo('excel', formData).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}coleta_dados/salvar_xlxs`);
      expect(req.request.method).toBe('POST');
      req.flush({ id_coleta: '123' });
    });
  });

  describe('carregarItensColetasDados', () => {
    it('should group all data input methods into one widget', (done) => {
      service.getItensColetasDados().pipe(skip(1)).subscribe(items => {
        expect(items.length).toBe(1);
        expect(items[0].label).toBe('Dados');
        expect(items[0].valor).toBe('dados');
        done();
      });

      service.carregarItensColetasDados();
      const req = httpMock.expectOne(`${environment.apiUrl}conf_pipeline/coleta_dados/todos`);
      req.flush([
        { label: 'CSV', valor: 'csv', tipoItem: 'coleta-dado', habilitado: true, movido: false },
        { label: 'JSON', valor: 'json', tipoItem: 'coleta-dado', habilitado: true, movido: false },
        { label: 'Excel', valor: 'xlxs', tipoItem: 'coleta-dado', habilitado: true, movido: false },
      ]);
    });
  });

  describe('emitirProximaEtapaPipe', () => {
    it('should emit event', (done) => {
      service.proximaEtapaPipe$.subscribe(data => {
        expect(data).toEqual({ etapa: 'inicio' });
        done();
      });
      service.emitirProximaEtapaPipe({ etapa: 'inicio' });
    });
  });

  describe('getModelosPorTipo', () => {
    it('should filter models by type', () => {
      const mockModelos = [
        { label: 'KNN', valor: 'knn', preverCategoria: true, dadosRotulados: true, movido: false, habilitado: true, icon: '', tipoItem: 'treino-validacao-teste' as const, id: '1' },
        { label: 'SVM', valor: 'svm', preverCategoria: false, dadosRotulados: true, movido: false, habilitado: true, icon: '', tipoItem: 'treino-validacao-teste' as const, id: '2' },
      ];
      (service as any).itensModelos.next(mockModelos);
      const result = service.getModelosPorTipo(true, true);
      expect(result.length).toBe(1);
      expect(result[0].valor).toBe('knn');
    });
  });

  describe('limparItensExecucao', () => {
    it('should clear items', (done) => {
      service.getItemsEmExecucao().pipe(skip(1)).subscribe(items => {
        expect(items).toEqual([]);
        done();
      });
      service.limparItensExecucao();
    });
  });

  describe('sincronizarPreProcessamentosSelecionados', () => {
    it('should replace selected preprocessing items without duplicates', (done) => {
      const standardScaler = { label: 'StandardScaler', valor: 'standard_scaler', preverCategoria: false, dadosRotulados: false, movido: false, habilitado: true, icon: '', tipoItem: 'pre-processamento' as const, id: '1' };
      const minMaxScaler = { label: 'MinMaxScaler', valor: 'minmax_scaler', preverCategoria: false, dadosRotulados: false, movido: false, habilitado: true, icon: '', tipoItem: 'pre-processamento' as const, id: '2' };
      const minMaxDuplicado = { ...minMaxScaler, id: '3' };
      (service as any).itensPreProcessamento.next([standardScaler, minMaxScaler, minMaxDuplicado]);

      service.getItemsEmExecucao().pipe(skip(1)).subscribe(items => {
        expect(items.map(item => item.valor)).toEqual(['minmax_scaler']);
        done();
      });

      service.sincronizarPreProcessamentosSelecionados([{ valor: 'minmax_scaler' }]);
    });
  });

  describe('moverItensEmExecucao', () => {
    it('should preserve selected toy dataset item when rebuilding execution items', (done) => {
      const datasetItem = {
        label: 'Iris',
        valor: 'dataset',
        preverCategoria: true,
        dadosRotulados: true,
        movido: true,
        habilitado: true,
        icon: 'coleta-dado',
        tipoItem: 'coleta-dado' as const,
        id: 'dataset-iris'
      };

      service.movendoItemExecucao(datasetItem);

      service.getItemsEmExecucao().pipe(skip(1)).subscribe(items => {
        expect(items.map(item => item.label)).toEqual(['Iris']);
        done();
      });

      service.moverItensEmExecucao();
    });
  });
});
