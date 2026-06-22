import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { AtividadeInterceptor } from './atividade.interceptor';
import { AtividadeService } from '../service/atividade/atividade.service';

describe('AtividadeInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let svc: jasmine.SpyObj<AtividadeService>;

  beforeEach(() => {
    svc = jasmine.createSpyObj('AtividadeService', ['registrar']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AtividadeService, useValue: svc },
        { provide: HTTP_INTERCEPTORS, useClass: AtividadeInterceptor, multi: true },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('registra GET 2xx (amostrado) e normaliza ids na rota', () => {
    spyOn(Math, 'random').and.returnValue(0); // < SAMPLE_GET → registra
    http.get('http://x/api/usuario/507f1f77bcf86cd799439011').subscribe();
    httpMock.expectOne('http://x/api/usuario/507f1f77bcf86cd799439011').flush({});
    expect(svc.registrar).toHaveBeenCalled();
    const args = svc.registrar.calls.mostRecent().args;
    expect(args[0]).toBe('http');
    expect(args[1]).toContain(':id'); // ObjectId vira :id
    expect((args[3] as any).status).toBe('sucesso');
  });

  it('amostra: GET 2xx fora da amostra não registra', () => {
    spyOn(Math, 'random').and.returnValue(0.99); // >= SAMPLE_GET → pula
    http.get('http://x/api/coleta').subscribe();
    httpMock.expectOne('http://x/api/coleta').flush({});
    expect(svc.registrar).not.toHaveBeenCalled();
  });

  it('mutação (POST) 2xx sempre registra, mesmo fora da amostra', () => {
    spyOn(Math, 'random').and.returnValue(0.99);
    http.post('http://x/api/coleta', {}).subscribe();
    httpMock.expectOne('http://x/api/coleta').flush({});
    expect(svc.registrar).toHaveBeenCalled();
    expect((svc.registrar.calls.mostRecent().args[3] as any).status).toBe('sucesso');
  });

  it('registra erro http com status erro', () => {
    http.get('http://x/api/treino/123').subscribe({ error: () => {} });
    httpMock.expectOne('http://x/api/treino/123').flush('e', { status: 500, statusText: 'err' });
    const args = svc.registrar.calls.mostRecent().args;
    expect(args[1]).toContain(':id'); // id numérico normalizado
    expect((args[3] as any).status).toBe('erro');
  });

  it('NÃO registra a própria telemetria (/atividades)', () => {
    http.post('http://x/atividades/lote', {}).subscribe();
    httpMock.expectOne('http://x/atividades/lote').flush({});
    expect(svc.registrar).not.toHaveBeenCalled();
  });

  it('NÃO registra o poller de saúde do tutor', () => {
    http.get('http://x/tutor/modelos/saude').subscribe();
    httpMock.expectOne('http://x/tutor/modelos/saude').flush({});
    expect(svc.registrar).not.toHaveBeenCalled();
  });
});
