import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../service/auth/auth.service';
import { SessaoRenovacaoService } from '../service/auth/sessao-renovacao.service';
import { NotificacaoService } from '../service/notificacao.service';
import { HttpClient } from '@angular/common/http';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: jasmine.SpyObj<AuthService>;
  let notificacao: jasmine.SpyObj<NotificacaoService>;
  let renovacao: jasmine.SpyObj<SessaoRenovacaoService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getToken', 'logout']);
    notificacao = jasmine.createSpyObj('NotificacaoService', ['sucesso', 'erro', 'aviso']);
    renovacao = jasmine.createSpyObj('SessaoRenovacaoService', ['aoUsar']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: NotificacaoService, useValue: notificacao },
        { provide: SessaoRenovacaoService, useValue: renovacao },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header when token exists', () => {
    authService.getToken.and.returnValue('my-token');
    httpClient.get('/test').subscribe();
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('should not add Authorization header when no token', () => {
    authService.getToken.and.returnValue(null);
    httpClient.get('/test').subscribe();
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should call logout on 401 response', () => {
    authService.getToken.and.returnValue('expired-token');
    httpClient.get('/test').subscribe({
      error: () => {
        expect(authService.logout).toHaveBeenCalled();
      },
    });
    const req = httpMock.expectOne('/test');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('should not logout on 401 from public endpoints', () => {
    authService.getToken.and.returnValue(null);
    httpClient.post('/login', {}).subscribe({ error: () => { } });

    const req = httpMock.expectOne('/login');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('não desloga nem toasta no 403 (o aviso é do ErrorInterceptor)', () => {
    // O usuário CONTINUA sendo avisado — a mensagem passou a sair só do ErrorInterceptor,
    // porque os dois interceptors toastavam o mesmo 403 com textos diferentes.
    authService.getToken.and.returnValue('valid-token');
    httpClient.get('/test').subscribe({ error: () => { } });

    const req = httpMock.expectOne('/test');
    req.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(notificacao.erro).not.toHaveBeenCalled();
    expect(authService.logout).not.toHaveBeenCalled();
  });

  // A renovação de sessão é acessória e roda no caminho de TODAS as respostas. Se ela puder
  // contaminar a requisição original, um detalhe do token derruba o app inteiro.
  describe('renovação de sessão não interfere na requisição', () => {
    it('a atividade do usuário dispara a renovação', () => {
      authService.getToken.and.returnValue('token');
      httpClient.get('/api/qualquer').subscribe();
      httpMock.expectOne('/api/qualquer').flush({ ok: true });

      expect(renovacao.aoUsar).toHaveBeenCalled();
    });

    it('uma exceção na renovação NÃO quebra a resposta', () => {
      authService.getToken.and.returnValue('token');
      renovacao.aoUsar.and.throwError('falha interna da renovação');

      let recebido: any = null;
      let erro: any = null;
      httpClient.get('/api/qualquer').subscribe({ next: r => recebido = r, error: e => erro = e });
      httpMock.expectOne('/api/qualquer').flush({ ok: true });

      expect(erro).toBeNull();
      expect(recebido).toEqual({ ok: true });
    });

    it('não conta a telemetria nem o próprio /login como atividade', () => {
      authService.getToken.and.returnValue('token');

      httpClient.post('/api/atividades/lote', {}).subscribe();
      httpMock.expectOne('/api/atividades/lote').flush({});
      httpClient.post('/api/login/renovar', {}).subscribe();
      httpMock.expectOne('/api/login/renovar').flush({});

      expect(renovacao.aoUsar).not.toHaveBeenCalled();
    });

    it('sem token não tenta renovar', () => {
      authService.getToken.and.returnValue(null);
      httpClient.get('/api/publico').subscribe();
      httpMock.expectOne('/api/publico').flush({});

      expect(renovacao.aoUsar).not.toHaveBeenCalled();
    });
  });
});
