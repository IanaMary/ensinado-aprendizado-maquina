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
const MODELOS = [
  { id: 'z-ai/glm-4.5-air:free', owned_by: 'z-ai', gratuito: true },
  { id: 'meta/llama-3.3-70b-instruct', owned_by: 'meta', gratuito: true },
  { id: 'meta/llama-3.1-8b-instruct', owned_by: 'meta', gratuito: true },
  { id: 'openai/gpt-5-pro', owned_by: 'openai', gratuito: false },
];

const PROVEDORES = [
  { id: 'nvidia', nome: 'NVIDIA NIM', base_url: 'https://integrate.api.nvidia.com/v1',
    modelo: 'meta/llama-3.3-70b-instruct', editavel: false, todos_gratuitos: true,
    chave_fonte: 'env', chave_mascarada: '••••abcd', env_chave: 'NVIDIA_API_KEY', configurado: true },
  { id: 'openrouter', nome: 'OpenRouter', base_url: 'https://openrouter.ai/api/v1', modelo: '',
    editavel: true, todos_gratuitos: false, chave_fonte: 'ausente', chave_mascarada: '',
    env_chave: 'OPENROUTER_API_KEY', configurado: false },
  { id: 'custom', nome: 'Outro provedor (OpenAI-compatible)', base_url: '', modelo: '',
    editavel: true, todos_gratuitos: null, chave_fonte: 'ausente', chave_mascarada: '',
    env_chave: null, configurado: false },
] as any[];

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
      'getProvedoresLLM', 'salvarProvedorLLM', 'definirProvedorLLMAtivo',
    ]);
    service.getTutorEditar.and.returnValue(of({ texto_pipe: 'oi' } as any));
    service.getTutorAudit.and.returnValue(of([] as any));
    service.getSystemPrompt.and.returnValue(of(prompt));
    service.putSystemPrompt.and.returnValue(of({ texto: prompt.padrao, personalizado: false }));
    service.listarModelosLLM.and.returnValue(of({ modelos: MODELOS, modelo_atual: 'meta/llama-3.3-70b-instruct',
                                                  provedor: { id: 'nvidia', nome: 'NVIDIA NIM', todos_gratuitos: true } } as any));
    service.verificarSaudeModelos.and.returnValue(of({
      resultados: { 'meta/llama-3.3-70b-instruct': { responde: true } },
      atualizado_em: 1, em_andamento: false, total: 4, concluidos: 4,
    } as any));
    service.getProvedoresLLM.and.returnValue(of({ ativo: 'nvidia', provedores: PROVEDORES } as any));
    service.salvarProvedorLLM.and.returnValue(of({ ativo: 'nvidia', provedores: PROVEDORES } as any));
    service.definirProvedorLLMAtivo.and.returnValue(of({ ativo: 'openrouter', provedores: PROVEDORES } as any));

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

  describe('listagem de modelos', () => {
    function naAbaLLM() {
      montar();
      comp.tabAtual({ index: 1 });
    }

    it('agrupa por fornecedor (o que vem antes da "/") e põe grupos com free na frente', () => {
      naAbaLLM();
      const grupos = comp.gruposModelos;
      expect(grupos.map((g) => g.fornecedor)).toEqual(['meta', 'z-ai', 'openai']);
      expect(grupos[0].modelos.length).toBe(2);
      expect(grupos[0].gratuitos).toBe(2);
      // openai só tem modelo pago, então vai para o fim
      expect(grupos[2].gratuitos).toBe(0);
    });

    it('abre sozinho só o grupo do modelo em uso', () => {
      naAbaLLM();
      expect(comp.grupoAberto('meta')).toBeTrue();     // é o fornecedor do modelo ativo
      expect(comp.grupoAberto('openai')).toBeFalse();
      comp.toggleFornecedor('openai');
      expect(comp.grupoAberto('openai')).toBeTrue();
    });

    it('busca por nome do modelo e por fornecedor', () => {
      naAbaLLM();
      comp.buscaModelo = 'llama-3.1';
      expect(comp.modelosFiltrados.map((m) => m.id)).toEqual(['meta/llama-3.1-8b-instruct']);
      comp.buscaModelo = 'z-ai';
      expect(comp.modelosFiltrados.length).toBe(1);
      comp.buscaModelo = ':free';
      expect(comp.modelosFiltrados.length).toBe(1);
    });

    it('durante a busca todos os grupos ficam abertos (senão o resultado fica escondido)', () => {
      naAbaLLM();
      expect(comp.grupoAberto('openai')).toBeFalse();
      comp.buscaModelo = 'gpt';
      expect(comp.grupoAberto('openai')).toBeTrue();
      comp.limparBusca();
      expect(comp.grupoAberto('openai')).toBeFalse();
    });

    it('testa um modelo isolado sem disparar o teste de todos', () => {
      naAbaLLM();
      service.verificarSaudeModelos.calls.reset();
      comp.testarModelo('openai/gpt-5-pro');
      expect(service.verificarSaudeModelos).toHaveBeenCalledWith(false, 'openai/gpt-5-pro');
    });
  });

  describe('provedores', () => {
    it('carrega a lista ao abrir a aba', () => {
      montar();
      comp.tabAtual({ index: 2 });
      expect(service.getProvedoresLLM).toHaveBeenCalled();
      expect(comp.provedores.length).toBe(3);
      expect(comp.provedorAtivo).toBe('nvidia');
    });

    it('o rascunho nunca nasce com a chave (a tela não a conhece)', () => {
      montar();
      comp.tabAtual({ index: 2 });
      expect(comp.formProvedor['nvidia'].api_key).toBe('');
      expect(comp.formProvedor['openrouter'].api_key).toBe('');
    });

    it('salvar manda a chave digitada e a limpa do formulário depois', () => {
      montar();
      comp.tabAtual({ index: 2 });
      comp.formProvedor['openrouter'].api_key = 'sk-or-v1-segredo';
      comp.salvarProvedor(comp.provedores[1]);
      expect(service.salvarProvedorLLM).toHaveBeenCalledWith('openrouter',
        jasmine.objectContaining({ api_key: 'sk-or-v1-segredo' }));
      expect(comp.formProvedor['openrouter'].api_key).toBe('');
    });

    it('não ativa provedor sem chave configurada', () => {
      montar();
      comp.tabAtual({ index: 2 });
      comp.trocarProvedorPeloSeletor('openrouter');    // configurado: false
      expect(service.definirProvedorLLMAtivo).not.toHaveBeenCalled();
    });

    it('trocar de provedor descarta a lista de modelos do anterior', () => {
      montar();
      comp.tabAtual({ index: 1 });
      expect(comp.modelosLLM.length).toBe(4);
      const openrouter = { ...PROVEDORES[1], configurado: true } as any;
      comp.provedores = [PROVEDORES[0] as any, openrouter];
      service.listarModelosLLM.calls.reset();
      comp.ativarProvedor(openrouter);
      // modelos e saúde são por provedor: a lista de antes não vale mais
      expect(service.listarModelosLLM).toHaveBeenCalled();
      expect(comp.buscaModelo).toBe('');
    });
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
