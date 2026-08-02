import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SessaoRenovacaoService } from './sessao-renovacao.service';
import { AuthService } from './auth.service';

/** O token durava 60 min sem renovação: o aluno caía no meio da atividade (banca, Imagem 10). */
describe('SessaoRenovacaoService', () => {
  let service: SessaoRenovacaoService;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;

  /** Token só com o `exp` — é tudo que o serviço lê. */
  function tokenQueExpiraEm(segundos: number): string {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + segundos }));
    return `cabecalho.${payload}.assinatura`;
  }

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['getToken']);
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SessaoRenovacaoService, { provide: AuthService, useValue: auth }],
    });
    service = TestBed.inject(SessaoRenovacaoService);
    httpMock = TestBed.inject(HttpTestingController);
    sessionStorage.clear();
  });

  afterEach(() => httpMock.verify());

  it('não renova com o token ainda longe de expirar', () => {
    auth.getToken.and.returnValue(tokenQueExpiraEm(50 * 60));
    service.aoUsar();
    httpMock.expectNone(r => r.url.includes('login/renovar'));
    expect(service.precisaRenovar()).toBeFalse();
  });

  it('renova quando falta pouco e guarda o token novo', () => {
    auth.getToken.and.returnValue(tokenQueExpiraEm(5 * 60));
    expect(service.precisaRenovar()).toBeTrue();

    service.aoUsar();
    httpMock.expectOne(r => r.url.includes('login/renovar')).flush({ access_token: 'novo-token' });

    expect(sessionStorage.getItem('token')).toBe('novo-token');
  });

  it('não dispara duas renovações ao mesmo tempo', () => {
    auth.getToken.and.returnValue(tokenQueExpiraEm(5 * 60));
    service.aoUsar();
    service.aoUsar();   // segunda chamada enquanto a primeira está no ar

    const req = httpMock.match(r => r.url.includes('login/renovar'));
    expect(req.length).toBe(1);
    req[0].flush({ access_token: 'novo-token' });
  });

  it('token já vencido não é renovado (aí é logout mesmo)', () => {
    auth.getToken.and.returnValue(tokenQueExpiraEm(-10));
    service.aoUsar();
    httpMock.expectNone(r => r.url.includes('login/renovar'));
  });

  it('falha na renovação não desloga: o token atual ainda vale', () => {
    auth.getToken.and.returnValue(tokenQueExpiraEm(5 * 60));
    sessionStorage.setItem('token', 'token-atual');

    service.aoUsar();
    httpMock.expectOne(r => r.url.includes('login/renovar'))
      .flush({}, { status: 500, statusText: 'erro' });

    expect(sessionStorage.getItem('token')).toBe('token-atual');
  });

  it('sem token não tenta nada', () => {
    auth.getToken.and.returnValue(null);
    service.aoUsar();
    httpMock.expectNone(r => r.url.includes('login/renovar'));
  });
});
