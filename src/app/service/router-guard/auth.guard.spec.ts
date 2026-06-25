import { TestBed } from '@angular/core/testing';
import { Router, Route, UrlSegment } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['autenticado', 'getUsuarioRole']);
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access for authenticated user with correct role', async () => {
    authService.autenticado.and.returnValue(Promise.resolve(true));
    authService.getUsuarioRole.and.returnValue('aluno');
    const segments = [new UrlSegment('inicio', {})];
    const result = await guard.canLoad({} as Route, segments);
    expect(result).toBeTrue();
  });

  it('should deny access for unauthenticated user', async () => {
    authService.autenticado.and.returnValue(Promise.resolve(false));
    const segments = [new UrlSegment('inicio', {})];
    const result = await guard.canLoad({} as Route, segments);
    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/autenticacao/login']);
  });

  it('should deny access for user with wrong role', async () => {
    authService.autenticado.and.returnValue(Promise.resolve(true));
    authService.getUsuarioRole.and.returnValue('aluno');
    const segments = [new UrlSegment('view-admin', {})];
    const result = await guard.canLoad({} as Route, segments);
    expect(result).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/autenticacao/login']);
  });

  it('should allow admin to access admin routes', async () => {
    authService.autenticado.and.returnValue(Promise.resolve(true));
    authService.getUsuarioRole.and.returnValue('admin');
    const segments = [new UrlSegment('view-admin', {})];
    const result = await guard.canLoad({} as Route, segments);
    expect(result).toBeTrue();
  });
});
