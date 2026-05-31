import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { environment } from '../../../environments/environment';

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
      service.getItemsEmExecucao().subscribe(items => {
        expect(items).toEqual([]);
        done();
      });
      service.limparItensExecucao();
    });
  });
});
