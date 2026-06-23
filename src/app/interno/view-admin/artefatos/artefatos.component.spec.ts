import { TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ArtefatosComponent } from './artefatos.component';
import { ArtefatosService } from '../../../service/artefatos/artefatos.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';

describe('ArtefatosComponent', () => {
  let comp: ArtefatosComponent;
  let svc: jasmine.SpyObj<ArtefatosService>;
  let dash: jasmine.SpyObj<DashboardService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj('ArtefatosService', ['listar', 'obterRun']);
    svc.listar.and.returnValue(of({ total: 0, itens: [] }));
    dash = jasmine.createSpyObj('DashboardService', ['listarUsuarios']);
    dash.listarUsuarios.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      declarations: [ArtefatosComponent],
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: ArtefatosService, useValue: svc },
        { provide: DashboardService, useValue: dash },
      ],
    }).compileComponents();
    comp = TestBed.createComponent(ArtefatosComponent).componentInstance;
  });

  it('lista runs e usuários no init', () => {
    comp.ngOnInit();
    expect(dash.listarUsuarios).toHaveBeenCalled();
    expect(svc.listar).toHaveBeenCalled();
  });

  it('converte datetime-local para ISO UTC ao filtrar', () => {
    comp.filtros.data_inicio = '2026-06-23T10:00';
    comp.aplicarFiltros();
    const filtros = svc.listar.calls.mostRecent().args[0] as any;
    expect(filtros.data_inicio).toMatch(/Z$/);
  });

  it('verDetalhe busca o resumo da run', () => {
    svc.obterRun.and.returnValue(of({ run_id: 'abc', params: {}, metrics: {}, tags: {}, artifacts: [], models: [], status: 'FINISHED' }));
    comp.verDetalhe('abc');
    expect(svc.obterRun).toHaveBeenCalledWith('abc');
    expect(comp.resumo.run_id).toBe('abc');
    expect(comp.runSelecionada).toBe('abc');
  });

  it('mapeia 503/404 no detalhe', () => {
    svc.obterRun.and.returnValue(throwError(() => ({ status: 503 })));
    comp.verDetalhe('abc');
    expect(comp.erroDetalhe).toContain('MLflow');

    svc.obterRun.and.returnValue(throwError(() => ({ status: 404 })));
    comp.verDetalhe('abc');
    expect(comp.erroDetalhe).toContain('não encontrada');
  });

  it('lista: 403 vira mensagem de acesso restrito', () => {
    svc.listar.and.returnValue(throwError(() => ({ status: 403 })));
    comp.buscar();
    expect(comp.erro).toContain('restrito');
  });

  it('paginação respeita os limites', () => {
    svc.listar.and.returnValue(of({ total: 120, itens: [] }));
    comp.total = 120;
    comp.limit = 50;
    comp.skip = 0;
    comp.proximaPagina();
    expect(comp.skip).toBe(50);
    comp.proximaPagina();
    expect(comp.skip).toBe(100);
    comp.proximaPagina(); // 100+50>=120 → não avança
    expect(comp.skip).toBe(100);
    comp.paginaAnterior();
    expect(comp.skip).toBe(50);
  });

  it('helpers formatarTamanho/entries', () => {
    expect(comp.entries({ a: 1 }).length).toBe(1);
    expect(comp.formatarTamanho(null)).toBe('—');
    expect(comp.formatarTamanho(2048)).toBe('2.0 KB');
  });
});
