import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../service/auth/auth.service';
import { NotificacaoService } from '../service/notificacao.service';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let notificacao: jasmine.SpyObj<NotificacaoService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getToken', 'logout']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    notificacao = jasmine.createSpyObj('NotificacaoService', ['sucesso', 'erro', 'aviso']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: NotificacaoService, useValue: notificacao },
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

  it('should notify the user on 403 response', () => {
    // Regressão: o 403 só ia para o console e o aluno não recebia feedback
    authService.getToken.and.returnValue('valid-token');
    httpClient.get('/test').subscribe({ error: () => { } });

    const req = httpMock.expectOne('/test');
    req.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(notificacao.erro).toHaveBeenCalledWith('Você não tem permissão para esta ação.');
    expect(authService.logout).not.toHaveBeenCalled();
  });
});
