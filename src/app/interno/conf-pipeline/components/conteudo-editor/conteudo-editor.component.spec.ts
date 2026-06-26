import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConteudoEditorComponent } from './conteudo-editor.component';

describe('ConteudoEditorComponent', () => {
  let component: ConteudoEditorComponent;
  let fixture: ComponentFixture<ConteudoEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConteudoEditorComponent],
    })
      .overrideComponent(ConteudoEditorComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(ConteudoEditorComponent);
    component = fixture.componentInstance;
  });

  it('carrega resumo_basico e link_yellowbrick do conteúdo existente', () => {
    component.conteudo = { resumo_basico: 'simples', link_yellowbrick: 'http://yb' };
    component.ngOnChanges({ conteudo: { currentValue: component.conteudo } } as any);
    expect(component.draft.resumo_basico).toBe('simples');
    expect(component.draft.link_yellowbrick).toBe('http://yb');
  });

  it('emite resumo_basico e link_yellowbrick ao salvar (e omite vazios)', () => {
    component.conteudo = null;
    component.ngOnChanges({ conteudo: { currentValue: null } } as any);
    component.draft.resumo_basico = '  texto básico  ';
    component.draft.link_yellowbrick = 'http://yb';
    let emitido: any = null;
    component.salvar.subscribe((c) => (emitido = c));
    component.emitirSalvar();
    expect(emitido.resumo_basico).toBe('texto básico');
    expect(emitido.link_yellowbrick).toBe('http://yb');
    expect('link_sklearn' in emitido).toBeFalse(); // vazio é omitido
  });
});
