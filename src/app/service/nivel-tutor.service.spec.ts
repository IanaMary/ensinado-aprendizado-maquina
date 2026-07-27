import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NivelTutorService } from './nivel-tutor.service';
import { environment } from '../../environments/environment';

/**
 * O nível é preferência de PERFIL: antes cada painel do tutor nascia em Básico e a escolha
 * sumia ao recarregar. Estes testes fixam as três garantias — parte do valor salvo, avisa quem
 * observa, e persiste no servidor sem quebrar a tela se a chamada falhar.
 */
describe('NivelTutorService', () => {
  let httpMock: HttpTestingController;

  function criar(): NivelTutorService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(NivelTutorService);
  }

  afterEach(() => sessionStorage.removeItem('nivel_tutor'));

  it('começa em básico quando não há preferência salva', () => {
    sessionStorage.removeItem('nivel_tutor');
    const svc = criar();
    expect(svc.nivel).toBe('basico');
    expect(svc.avancado).toBeFalse();
  });

  it('parte do nível que veio no login', () => {
    sessionStorage.setItem('nivel_tutor', 'avancado');
    const svc = criar();
    expect(svc.nivel).toBe('avancado');
    expect(svc.avancado).toBeTrue();
  });

  it('definir persiste no perfil e avisa quem observa', () => {
    const svc = criar();
    const vistos: string[] = [];
    svc.observar().subscribe(n => vistos.push(n));

    svc.definir('avancado');

    const req = httpMock.expectOne(`${environment.apiUrl}usuario/preferencias`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nivel_tutor: 'avancado' });
    req.flush({ nivel_tutor: 'avancado' });

    expect(vistos).toEqual(['basico', 'avancado']);
    expect(sessionStorage.getItem('nivel_tutor')).toBe('avancado');
  });

  it('falha ao salvar não derruba a escolha na tela', () => {
    const svc = criar();
    svc.definir('avancado');
    httpMock.expectOne(`${environment.apiUrl}usuario/preferencias`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(svc.nivel).toBe('avancado');
  });

  it('definirLocal (valor do login) não chama o servidor', () => {
    const svc = criar();
    svc.definirLocal('avancado');
    httpMock.expectNone(`${environment.apiUrl}usuario/preferencias`);
    expect(svc.nivel).toBe('avancado');
    svc.definirLocal(null);          // conta antiga, sem o campo
    expect(svc.nivel).toBe('basico');
  });
});
