import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TiposClassificadoresComponent } from './tipos-classificadores.component';

describe('TiposClassificadoresComponent', () => {
  let component: TiposClassificadoresComponent;
  let fixture: ComponentFixture<TiposClassificadoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TiposClassificadoresComponent],
      imports: [HttpClientTestingModule]
    })
    .overrideComponent(TiposClassificadoresComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(TiposClassificadoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /** O nível é lido quando o serviço é criado, então cada caso precisa de um injetor novo. */
  async function montarComNivel(nivel: string) {
    sessionStorage.setItem('nivel_tutor', nivel);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      declarations: [TiposClassificadoresComponent],
      imports: [HttpClientTestingModule],
    })
      .overrideComponent(TiposClassificadoresComponent, { set: { template: '' } })
      .compileComponents();
    return TestBed.createComponent(TiposClassificadoresComponent).componentInstance;
  }

  it('abre os hiperparâmetros avançados para quem escolheu o nível Avançado', async () => {
    // A seção ignorava a preferência do aluno e vinha sempre fechada.
    expect((await montarComNivel('avancado')).mostrarAvancados).toBeTrue();
    expect((await montarComNivel('basico')).mostrarAvancados).toBeFalse();
    sessionStorage.removeItem('nivel_tutor');
  });
});
