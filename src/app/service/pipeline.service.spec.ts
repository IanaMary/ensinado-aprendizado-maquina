import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PipelineService, PipelineState } from './pipeline.service';
import { environment } from '../../environments/environment';

describe('PipelineService', () => {
  let service: PipelineService;
  let httpMock: HttpTestingController;

  const endpoint = `${environment.apiUrl}pipelines`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(PipelineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should POST when saving a pipeline without id', () => {
    const state: PipelineState = { nome: 'Novo' };
    service.salvarPipeline(state).subscribe();

    const req = httpMock.expectOne(`${endpoint}/`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: '1', nome: 'Novo' });
  });

  it('should PUT when saving a pipeline with id', () => {
    const state: PipelineState = { id: 'abc', nome: 'Existente' };
    service.salvarPipeline(state).subscribe();

    const req = httpMock.expectOne(`${endpoint}/abc`);
    expect(req.request.method).toBe('PUT');
    req.flush(state);
  });

  it('should update pipelineAtual$ when loading a pipeline', () => {
    let atual: PipelineState | null = null;
    service.pipelineAtual$.subscribe(p => (atual = p));

    service.carregarPipeline('xyz').subscribe();
    const req = httpMock.expectOne(`${endpoint}/xyz`);
    req.flush({ id: 'xyz', nome: 'Carregado' });

    expect(atual!).toEqual(jasmine.objectContaining({ id: 'xyz', nome: 'Carregado' }));
  });

  it('should map delete response to true', () => {
    let resultado: boolean | undefined;
    service.excluirPipeline('xyz').subscribe(r => (resultado = r));

    const req = httpMock.expectOne(`${endpoint}/xyz`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ mensagem: 'ok' });

    expect(resultado).toBeTrue();
  });

  it('should request the gallery endpoint', () => {
    service.listarPipelinesProfessores().subscribe();

    const req = httpMock.expectOne(`${endpoint}/galeria`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should clear pipelineAtual$', () => {
    let atual: PipelineState | null = { nome: 'x' } as PipelineState;
    service.pipelineAtual$.subscribe(p => (atual = p));

    service.limparPipelineAtual();
    expect(atual).toBeNull();
  });
});
