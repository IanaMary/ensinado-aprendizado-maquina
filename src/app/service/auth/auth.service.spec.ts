import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(AuthService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isAuthenticated', () => {
    it('should return false when no token', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should return true for valid non-expired token', () => {
      const payload = { sub: 'test@test.com', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' +
                    btoa(JSON.stringify(payload)) + '.signature';
      sessionStorage.setItem('token', token);
      expect(service.isAuthenticated()).toBeTrue();
    });

    it('should return false for expired token', () => {
      const payload = { sub: 'test@test.com', exp: Math.floor(Date.now() / 1000) - 3600 };
      const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' +
                    btoa(JSON.stringify(payload)) + '.signature';
      sessionStorage.setItem('token', token);
      expect(service.isAuthenticated()).toBeFalse();
    });
  });

  describe('salvarUsuarioSessionStorage', () => {
    it('should save user data to sessionStorage', async () => {
      const usuario = {
        access_token: 'test-token',
        usuario: { _id: '123', name: 'Test', role: 'aluno' },
      };
      await service.salvarUsuarioSessionStorage(usuario);
      expect(sessionStorage.getItem('token')).toBe('test-token');
      expect(sessionStorage.getItem('id')).toBe('123');
      expect(sessionStorage.getItem('name')).toBe('Test');
      expect(sessionStorage.getItem('role')).toBe('aluno');
    });
  });

  describe('limparSessionStorage', () => {
    it('should clear sessionStorage', async () => {
      sessionStorage.setItem('token', 'test');
      sessionStorage.setItem('role', 'admin');
      await service.limparSessionStorage();
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(sessionStorage.getItem('role')).toBeNull();
    });
  });

  describe('getUsuarioRole', () => {
    it('should return role from sessionStorage', () => {
      sessionStorage.setItem('role', 'professor');
      expect(service.getUsuarioRole()).toBe('professor');
    });

    it('should return empty string when no role', () => {
      expect(service.getUsuarioRole()).toBe('');
    });
  });

  describe('getToken', () => {
    it('should return token from sessionStorage', () => {
      sessionStorage.setItem('token', 'my-token');
      expect(service.getToken()).toBe('my-token');
    });

    it('should return null when no token', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear sessionStorage and navigate to login', () => {
      sessionStorage.setItem('token', 'test');
      service.logout();
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/autenticacao/login'], { queryParams: { expirado: 1 } });
    });
  });
});
