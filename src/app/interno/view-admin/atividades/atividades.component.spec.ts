import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { AtividadesComponent } from './atividades.component';
import { AtividadeService } from '../../../service/atividade/atividade.service';

describe('AtividadesComponent', () => {
  let fixture: ComponentFixture<AtividadesComponent>;
  let comp: AtividadesComponent;
  let svc: jasmine.SpyObj<AtividadeService>;

  beforeEach(async () => {
    svc = jasmine.createSpyObj('AtividadeService', ['listar', 'resumo']);
    svc.listar.and.returnValue(of({ total: 0, itens: [] }));
    svc.resumo.and.returnValue(
      of({ total: 0, total_erros: 0, usuarios_ativos: 0, por_tipo: [], por_acao: [] }),
    );
    await TestBed.configureTestingModule({
      declarations: [AtividadesComponent],
      imports: [CommonModule, FormsModule],
      providers: [{ provide: AtividadeService, useValue: svc }],
    }).compileComponents();
    fixture = TestBed.createComponent(AtividadesComponent);
    comp = fixture.componentInstance;
  });

  it('carrega resumo e lista no init', () => {
    fixture.detectChanges();
    expect(svc.resumo).toHaveBeenCalled();
    expect(svc.listar).toHaveBeenCalled();
  });

  it('converte datetime-local para ISO UTC ao filtrar', () => {
    comp.filtros.data_inicio = '2026-06-22T10:00';
    comp.aplicarFiltros();
    const filtros = svc.listar.calls.mostRecent().args[0] as any;
    expect(filtros.data_inicio).toMatch(/Z$/);
  });

  it('paginação respeita os limites', () => {
    // buscar() reescreve total a partir da resposta; mantém 120 ao paginar
    svc.listar.and.returnValue(of({ total: 120, itens: [] }));
    comp.total = 120;
    comp.limit = 50;
    comp.skip = 0;
    comp.proximaPagina();
    expect(comp.skip).toBe(50);
    comp.proximaPagina();
    expect(comp.skip).toBe(100);
    comp.proximaPagina(); // 100+50 >= 120 → não avança
    expect(comp.skip).toBe(100);
    comp.paginaAnterior();
    expect(comp.skip).toBe(50);
    comp.paginaAnterior();
    comp.paginaAnterior(); // não desce abaixo de 0
    expect(comp.skip).toBe(0);
  });
});
