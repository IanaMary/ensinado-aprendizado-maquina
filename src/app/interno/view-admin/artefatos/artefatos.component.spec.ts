import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ArtefatosComponent } from './artefatos.component';
import { ArtefatosService } from '../../../service/artefatos/artefatos.service';

describe('ArtefatosComponent', () => {
  let comp: ArtefatosComponent;
  let svc: jasmine.SpyObj<ArtefatosService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj('ArtefatosService', ['obterRun']);
    await TestBed.configureTestingModule({
      declarations: [ArtefatosComponent],
      imports: [CommonModule, FormsModule],
      providers: [{ provide: ArtefatosService, useValue: svc }],
    }).compileComponents();
    comp = TestBed.createComponent(ArtefatosComponent).componentInstance;
  });

  it('busca e exibe o resumo', () => {
    svc.obterRun.and.returnValue(
      of({ run_id: 'abc', params: { n: '1' }, metrics: {}, tags: {}, artifacts: [], models: [], status: 'FINISHED', start_time: 1, end_time: 2 }),
    );
    comp.runId = 'abc';
    comp.buscar();
    expect(svc.obterRun).toHaveBeenCalledWith('abc');
    expect(comp.resumo.run_id).toBe('abc');
    expect(comp.erro).toBe('');
  });

  it('exige run_id (não chama o serviço)', () => {
    comp.runId = '   ';
    comp.buscar();
    expect(comp.erro).toContain('run_id');
    expect(svc.obterRun).not.toHaveBeenCalled();
  });

  it('mapeia 503 para mensagem amigável', () => {
    svc.obterRun.and.returnValue(throwError(() => ({ status: 503 })));
    comp.runId = 'abc';
    comp.buscar();
    expect(comp.erro).toContain('MLflow');
    expect(comp.resumo).toBeNull();
  });

  it('mapeia 404 e 400', () => {
    svc.obterRun.and.returnValue(throwError(() => ({ status: 404 })));
    comp.runId = 'abc';
    comp.buscar();
    expect(comp.erro).toContain('não encontrada');

    svc.obterRun.and.returnValue(throwError(() => ({ status: 400 })));
    comp.buscar();
    expect(comp.erro).toContain('inválido');
  });

  it('helpers entries() e formatarTamanho()', () => {
    expect(comp.entries({ a: 1, b: 2 }).length).toBe(2);
    expect(comp.entries(null).length).toBe(0);
    expect(comp.formatarTamanho(null)).toBe('—');
    expect(comp.formatarTamanho(2048)).toBe('2.0 KB');
    expect(comp.formatarTamanho(512)).toBe('512 B');
  });
});
