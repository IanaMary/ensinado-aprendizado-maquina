import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { SelecaoMetricasComponent } from './selecao-metricas.component';

describe('SelecaoMetricasComponent', () => {
  let component: SelecaoMetricasComponent;
  let fixture: ComponentFixture<SelecaoMetricasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SelecaoMetricasComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(SelecaoMetricasComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(SelecaoMetricasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('grupoTodasMarcadas reflete o rótulo Todos/Nenhum do toggle', () => {
    const grupo = {
      nome: 'Classificação', icone: 'category', itens: [
        { habilitado: true, movido: false } as any,
        { habilitado: true, movido: false } as any,
        { habilitado: false, movido: false } as any, // desabilitada não conta
      ],
    };
    // nem todas marcadas -> "Todos"
    expect(component.grupoTodasMarcadas(grupo)).toBeFalse();
    // toggle marca todas as habilitadas
    component.toggleGrupo(grupo);
    expect(grupo.itens[0].movido).toBeTrue();
    expect(grupo.itens[1].movido).toBeTrue();
    expect(component.grupoTodasMarcadas(grupo)).toBeTrue(); // agora "Nenhum"
    // toggle de novo desmarca
    component.toggleGrupo(grupo);
    expect(component.grupoTodasMarcadas(grupo)).toBeFalse();
  });
});
