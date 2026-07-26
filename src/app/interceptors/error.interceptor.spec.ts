import { TestBed } from '@angular/core/testing';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorInterceptor } from './error.interceptor';
import { ErrorLogService } from '../service/error-log.service';

describe('ErrorInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let logService: jasmine.SpyObj<ErrorLogService>;

  beforeEach(() => {
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    logService = jasmine.createSpyObj('ErrorLogService', ['logError']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: MatSnackBar, useValue: snackBar },
        { provide: ErrorLogService, useValue: logService },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  it('avisa UMA vez no 403, com a mensagem de permissão', () => {
    // Este interceptor é o único responsável pelo aviso ao usuário (o AuthInterceptor
    // cuida só do logout no 401); antes os dois toastavam o mesmo 403.
    httpClient.get('/test').subscribe({ error: () => { } });
    httpMock.expectOne('/test').flush({}, { status: 403, statusText: 'Forbidden' });

    expect(snackBar.open).toHaveBeenCalledTimes(1);
    expect(snackBar.open.calls.mostRecent().args[0]).toBe('Você não tem permissão para esta ação.');
  });

  it('mostra o detail do backend quando existe', () => {
    httpClient.get('/test').subscribe({ error: () => { } });
    httpMock.expectOne('/test').flush({ detail: 'Código de turma inválido.' },
      { status: 404, statusText: 'Not Found' });

    expect(snackBar.open.calls.mostRecent().args[0]).toBe('Código de turma inválido.');
  });

  it('não toasta erros da própria rota de log', () => {
    httpClient.post('/sistema/erro', {}).subscribe({ error: () => { } });
    httpMock.expectOne('/sistema/erro').flush({}, { status: 500, statusText: 'Server Error' });

    expect(snackBar.open).not.toHaveBeenCalled();
    expect(logService.logError).not.toHaveBeenCalled();
  });
});
