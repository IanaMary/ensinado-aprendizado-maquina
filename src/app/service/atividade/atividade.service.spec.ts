import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AtividadeService } from './atividade.service';
import { environment } from '../../../environments/environment';

describe('AtividadeService', () => {
  let service: AtividadeService;
  let httpMock: HttpTestingController;
  const loteUrl = `${environment.apiUrl}atividades/lote`;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
    });
    service = TestBed.inject(AtividadeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sessionStorage.clear();
    httpMock.verify();
  });

  it('não registra/envia sem token', () => {
    service.registrar('ui', 'x');
    service.flush();
    httpMock.expectNone(loteUrl);
  });

  it('registra e faz flush com token', () => {
    sessionStorage.setItem('token', 'tok');
    service.registrar('ui', 'clique', { a: 1 }, { pipeline_id: 'p1' });
    service.flush();
    const req = httpMock.expectOne(loteUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.eventos.length).toBe(1);
    expect(req.request.body.eventos[0].acao).toBe('clique');
    expect(req.request.body.eventos[0].pipeline_id).toBe('p1');
    expect(req.request.body.eventos[0].timestamp_cliente).toBeTruthy();
    req.flush({ gravados: 1 });
  });

  it('faz flush automático ao atingir o limite do buffer (10)', () => {
    sessionStorage.setItem('token', 'tok');
    for (let i = 0; i < 10; i++) {
      service.registrar('http', 'g' + i);
    }
    const req = httpMock.expectOne(loteUrl);
    expect(req.request.body.eventos.length).toBe(10);
    req.flush({ gravados: 10 });
  });

  it('mede duração com iniciarAcao/finalizarAcao', () => {
    sessionStorage.setItem('token', 'tok');
    service.iniciarAcao('treino');
    service.finalizarAcao('treino', { x: 1 }, { acao: 'treinou_modelo' });
    service.flush();
    const ev = httpMock.expectOne(loteUrl).request.body.eventos[0];
    expect(ev.acao).toBe('treinou_modelo');
    expect(typeof ev.duracao_ms).toBe('number');
    expect(ev.status).toBe('sucesso');
  });

  it('re-enfileira os eventos quando o flush falha', () => {
    sessionStorage.setItem('token', 'tok');
    service.registrar('ui', 'a');
    service.flush();
    httpMock.expectOne(loteUrl).flush('erro', { status: 500, statusText: 'err' });
    // os eventos voltaram ao buffer: um novo flush reenvia
    service.flush();
    const req2 = httpMock.expectOne(loteUrl);
    expect(req2.request.body.eventos[0].acao).toBe('a');
    req2.flush({});
  });

  it('NÃO re-enfileira em erro 4xx (payload rejeitado)', () => {
    sessionStorage.setItem('token', 'tok');
    service.registrar('ui', 'a');
    service.flush();
    httpMock.expectOne(loteUrl).flush('rejeitado', { status: 422, statusText: 'Unprocessable' });
    // 4xx: descartado — um novo flush não envia nada
    service.flush();
    httpMock.expectNone(loteUrl);
  });

  it('listar() monta a querystring ignorando vazios', () => {
    sessionStorage.setItem('token', 'tok');
    service.listar({ tipo: 'chat', skip: 0, limit: 50, acao: '' }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url.includes('/atividades') && r.url.includes('tipo=chat'),
    );
    expect(req.request.url).toContain('limit=50');
    expect(req.request.url).not.toContain('acao=');
    req.flush({});
  });
});
