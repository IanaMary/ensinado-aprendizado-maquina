import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ConfTutorComponent } from './conf-tutor.component';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../service/notificacao.service';
import { AuthService } from '../../../service/auth/auth.service';
import { LoginService } from '../../../externo/autenticacao/login/services/login.service';

/**
 * Aba LLM do conf-tutor: o que a tela precisa dizer sobre a instrução de sistema.
 *
 * O `DashboardService` é stubado por objeto (spies devolvendo `of(...)`) em vez de
 * `HttpTestingController`: o `ngOnInit` já dispara histórico + boas-vindas, e ficar dando flush em
 * requisições irrelevantes esconderia o que estes casos querem provar.
 */
const PROMPT_PADRAO = {
  texto: 'Você é o tutor.', padrao: 'Você é o tutor.', personalizado: false, limite: 6000,
  fonte: 'banco', origem: 'versionado', padrao_desatualizado: false, versao: 1,
};

describe('ConfTutorComponent (aba LLM)', () => {
  let fixture: ComponentFixture<ConfTutorComponent>;
  let comp: ConfTutorComponent;
  let service: jasmine.SpyObj<DashboardService>;

  function montar(prompt: any = PROMPT_PADRAO) {
    TestBed.resetTestingModule();
    service = jasmine.createSpyObj('DashboardService', [
      'getTutorEditar', 'putTutorPipe', 'getTutorAudit', 'getSystemPrompt', 'putSystemPrompt',
      'listarModelosLLM', 'verificarSaudeModelos', 'definirModeloLLM',
    ]);
    service.getTutorEditar.and.returnValue(of({ texto_pipe: 'oi' } as any));
    service.getTutorAudit.and.returnValue(of([] as any));
    service.getSystemPrompt.and.returnValue(of(prompt));
    service.putSystemPrompt.and.returnValue(of({ texto: prompt.padrao, personalizado: false }));
    service.listarModelosLLM.and.returnValue(of({ modelos: [], modelo_atual: 'x' } as any));
    service.verificarSaudeModelos.and.returnValue(of({} as any));

    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [FormsModule, ReactiveFormsModule],
      declarations: [ConfTutorComponent],
      providers: [
        { provide: DashboardService, useValue: service },
        { provide: NotificacaoService, useValue: jasmine.createSpyObj('NotificacaoService', ['sucesso', 'erro']) },
        { provide: AuthService, useValue: { getUsuarioRole: () => 'admin' } },
        { provide: LoginService, useValue: {} },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
      ],
    });
    fixture = TestBed.createComponent(ConfTutorComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('mapeia o estado de versão devolvido pelo backend', () => {
    montar({ ...PROMPT_PADRAO, fonte: 'banco', origem: 'admin', personalizado: true,
             padrao_desatualizado: true });
    comp.tabAtual({ index: 1 });
    expect(comp.promptCarregado).toBeTrue();
    expect(comp.promptFonte).toBe('banco');
    expect(comp.promptOrigem).toBe('admin');
    expect(comp.promptPadraoDesatualizado).toBeTrue();
  });

  it('não acende o aviso quando o backend não manda o campo (backend anterior)', () => {
    montar({ texto: 'x', padrao: 'x', personalizado: false, limite: 6000 });
    comp.tabAtual({ index: 1 });
    expect(comp.promptPadraoDesatualizado).toBeFalse();
    expect(comp.promptFonte).toBe('');
  });

  it('busca o prompt uma vez por visita à aba, sem depender do conteúdo do textarea', () => {
    // Regressão: a guarda era `!this.promptTexto`. Se o admin limpasse o campo e voltasse à aba,
    // o GET refazia por cima do que ele estava editando.
    montar();
    comp.tabAtual({ index: 1 });
    comp.promptTexto = '';
    comp.tabAtual({ index: 0 });
    comp.tabAtual({ index: 1 });
    expect(service.getSystemPrompt).toHaveBeenCalledTimes(1);
    expect(comp.promptTexto).toBe('');   // não foi sobrescrito
  });

  it('conta os caracteres como o servidor conta (texto sem espaço nas pontas)', () => {
    montar();
    comp.promptTexto = '  abc  ';
    expect(comp.promptTamanho).toBe(3);
  });

  it('pede confirmação antes de tirar do ar a instrução personalizada', () => {
    montar({ ...PROMPT_PADRAO, personalizado: true, origem: 'admin' });
    comp.tabAtual({ index: 1 });
    spyOn(window, 'confirm').and.returnValue(false);
    comp.restaurarPromptPadrao();
    expect(service.putSystemPrompt).not.toHaveBeenCalled();

    (window.confirm as jasmine.Spy).and.returnValue(true);
    comp.restaurarPromptPadrao();
    expect(service.putSystemPrompt).toHaveBeenCalledWith('');
  });

  it('não pergunta nada quando já está no padrão do sistema', () => {
    montar();
    comp.tabAtual({ index: 1 });
    const confirmSpy = spyOn(window, 'confirm');
    comp.restaurarPromptPadrao();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(service.putSystemPrompt).toHaveBeenCalledWith('');
  });
});
