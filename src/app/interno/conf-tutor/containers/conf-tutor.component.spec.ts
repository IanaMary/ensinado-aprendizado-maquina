import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
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
    chave_fonte: 'env', chave_mascarada: '••••abcd', env_chave: 'NVIDIA_API_KEY', configurado: true,
    fallbacks: ['meta/llama-3.1-8b-instruct'], fallbacks_origem: 'catalogo',
    exige_chave: true, chaves: [{ indice: 0, mascarada: '••••abcd' }], chaves_no_banco: 0 },
  { id: 'openrouter', nome: 'OpenRouter', base_url: 'https://openrouter.ai/api/v1', modelo: '',
    editavel: true, todos_gratuitos: false, chave_fonte: 'ausente', chave_mascarada: '',
    env_chave: 'OPENROUTER_API_KEY', configurado: false,
    exige_chave: true, chaves: [], chaves_no_banco: 0 },
  { id: 'gemini', nome: 'Google AI Studio (Gemini)',
    base_url: 'https://generativelanguage.googleapis.com/v1beta/openai', modelo: '',
    editavel: true, todos_gratuitos: null, chave_fonte: 'ausente', chave_mascarada: '',
    env_chave: 'GEMINI_API_KEY', configurado: true, fallbacks: [], fallbacks_origem: 'catalogo',
    exige_chave: true, chaves_no_banco: 2,
    chaves: [{ indice: 0, mascarada: '••••sCnA' }, { indice: 1, mascarada: '••••X9k2' }] },
  { id: 'custom', nome: 'Outro provedor (OpenAI-compatible)', base_url: '', modelo: '',
    editavel: true, todos_gratuitos: null, chave_fonte: 'ausente', chave_mascarada: '',
    env_chave: null, configurado: false,
    exige_chave: false, chaves: [], chaves_no_banco: 0 },
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
      'salvarFallbacksLLM', 'restaurarFallbacksLLM', 'adicionarChaveLLM', 'removerChaveLLM',
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
    service.salvarFallbacksLLM.and.returnValue(of({ ativo: 'nvidia', provedores: PROVEDORES } as any));
    service.restaurarFallbacksLLM.and.returnValue(of({ ativo: 'nvidia', provedores: PROVEDORES } as any));
    service.adicionarChaveLLM.and.returnValue(of({ ativo: 'nvidia', provedores: PROVEDORES } as any));
    service.removerChaveLLM.and.returnValue(of({ ativo: 'nvidia', provedores: PROVEDORES } as any));

    TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      // O editor visual é um ControlValueAccessor de verdade: com NO_ERRORS_SCHEMA e sem o
      // módulo, `formControlName="texto_pipe"` fica sem accessor (NG01203).
      imports: [FormsModule, ReactiveFormsModule, QuillModule],
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

  it('a pré-visualização mostra o HTML já convertido (o que será salvo)', () => {
    // Antes mostrava a saída crua do editor: lista numerada e `&nbsp;` que o conversor remove.
    montar();
    comp.formConfTutorInicio.patchValue({
      texto_pipe: '<ol><li data-list="bullet">um</li></ol><p>a\u00A0b</p>',
    });
    expect(comp.previewInicio).toContain('<ul>');
    expect(comp.previewInicio).not.toContain('\u00A0');
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

    it('mostra a lista mesmo quando NADA foi testado (provedor sem informação de preço)', () => {
      // Regressão: `verificacaoConcluida` exigia `total > 0`, então um endpoint customizado (onde
      // nada entra no teste automático) carregava 300 modelos e não renderizava nenhum — sem como
      // escolher o primeiro.
      montar();   // o `montar` define os stubs padrão; o override vem depois dele
      service.verificarSaudeModelos.and.returnValue(of({
        resultados: {}, atualizado_em: 1, em_andamento: false, total: 0, concluidos: 0,
      } as any));
      comp.tabAtual({ index: 1 });
      expect(comp.verificacaoConcluida).toBeTrue();
      expect(comp.nenhumTesteAutomatico).toBeTrue();
      expect(comp.gruposModelos.length).toBeGreaterThan(0);
    });

    it('grupos com MAIS gratuitos vêm primeiro', () => {
      naAbaLLM();
      const grupos = comp.gruposModelos;
      // meta tem 2 gratuitos, z-ai tem 1, openai nenhum
      expect(grupos.map((g) => g.gratuitos)).toEqual([2, 1, 0]);
    });

    it('recolher um grupo funciona mesmo com busca ativa', () => {
      naAbaLLM();
      comp.buscaModelo = 'meta';
      expect(comp.grupoAberto('meta')).toBeTrue();
      comp.toggleFornecedor('meta');
      expect(comp.grupoAberto('meta')).toBeFalse();   // antes a busca forçava `true`
    });

    it('testa um modelo isolado sem disparar o teste de todos', () => {
      naAbaLLM();
      service.verificarSaudeModelos.calls.reset();
      comp.testarModelo('openai/gpt-5-pro');
      expect(service.verificarSaudeModelos).toHaveBeenCalledWith(false, 'openai/gpt-5-pro');
    });
  });

  /**
   * Os casos acima afirmam sobre GETTERS. O defeito de 30/07 não estava em getter nenhum: a lista
   * ficava escondida por um `*ngIf` do template (`verificacaoConcluida` exigia `total > 0`), então
   * um provedor que não informa preço carregava 300 modelos e a tela ficava vazia — com
   * `gruposModelos.length` maior que zero o tempo todo. Um teste de getter passa verde nesse cenário;
   * só olhando o DOM ele acende.
   */
  describe('a listagem chega à TELA (DOM)', () => {
    /** Estados possíveis do teste de saúde, do ponto de vista da tela. */
    const SAUDE = {
      nadaTestado:  { resultados: {}, atualizado_em: 1, em_andamento: false, total: 0, concluidos: 0 },
      emAndamento:  { resultados: {}, atualizado_em: 1, em_andamento: true,  total: 4, concluidos: 1 },
      parcial:      { resultados: { 'meta/llama-3.3-70b-instruct': { responde: true } },
                      atualizado_em: 1, em_andamento: false, total: 4, concluidos: 2 },
      tudoTestado:  { resultados: { 'meta/llama-3.3-70b-instruct': { responde: true },
                                    'openai/gpt-5-pro': { responde: false } },
                      atualizado_em: 1, em_andamento: false, total: 4, concluidos: 4 },
    } as any;

    function naAbaLLMCom(saude: any) {
      montar();
      service.verificarSaudeModelos.and.returnValue(of(saude));
      comp.tabAtual({ index: 1 });
      fixture.detectChanges();
    }

    const noDom = (sel: string) => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll(sel));
    const textoDaTela = () => (fixture.nativeElement.textContent || '').replace(/\s+/g, ' ');

    it('provedor sem informação de preço: os fornecedores aparecem e dá para escolher um modelo', () => {
      naAbaLLMCom(SAUDE.nadaTestado);

      // era isto que dava zero: nenhum cabeçalho de fornecedor no DOM
      const fornecedores = noDom('.grupo-fornecedor .fornecedor-titulo');
      expect(fornecedores.length).toBe(3);
      expect(textoDaTela()).toContain('teste sob demanda');

      // e o caminho do admin — abrir um grupo e ver os modelos — funciona
      const semAberto = noDom('.lista-modelos .modelo-item').length;
      fornecedores.find((b) => b.textContent!.includes('openai'))!.click();
      fixture.detectChanges();
      expect(noDom('.lista-modelos .modelo-item').length).toBeGreaterThan(semAberto);
    });

    it('em NENHUM estado do teste de saúde a tela fica em branco', () => {
      // A regra que o defeito violou: o que o admin vê não pode depender do resultado de um teste
      // que é opcional por natureza. Ou a lista está lá, ou há um progresso explicando a espera.
      for (const [nome, saude] of Object.entries(SAUDE)) {
        naAbaLLMCom(saude);
        const temLista = noDom('.grupo-fornecedor').length > 0;
        const temProgresso = noDom('.verificando-modelos').length > 0;
        expect(temLista || temProgresso)
          .withContext(`estado "${nome}": nem listagem nem progresso na tela`).toBeTrue();
        fixture.destroy();   // encerra o polling do estado emAndamento
      }
    });

    it('enquanto o teste roda, a espera é explicada (e não é uma tela vazia)', () => {
      naAbaLLMCom(SAUDE.emAndamento);
      expect(noDom('.verificando-modelos').length).toBe(1);
      expect(noDom('.grupo-fornecedor').length).toBe(0);
      expect(textoDaTela()).toContain('Verificando quais modelos estão ativos');
      fixture.destroy();
    });

    it('provedor que respondeu o teste mostra o resumo de quantos respondem', () => {
      naAbaLLMCom(SAUDE.tudoTestado);
      expect(noDom('.grupo-fornecedor').length).toBe(3);
      expect(textoDaTela()).toContain('respondem');
      expect(textoDaTela()).not.toContain('teste sob demanda');
    });

    it('sem nenhum modelo, a tela diz isso em vez de ficar muda', () => {
      montar();
      service.listarModelosLLM.and.returnValue(of({ modelos: [], modelo_atual: '' } as any));
      comp.tabAtual({ index: 1 });
      fixture.detectChanges();
      expect(noDom('.vazio-modelos').length).toBe(1);
    });
  });

  describe('provedores', () => {
    it('a aba LLM também carrega os provedores (o seletor depende deles)', () => {
      montar();
      comp.tabAtual({ index: 1 });
      expect(service.getProvedoresLLM).toHaveBeenCalled();
      expect(comp.provedores.length).toBe(PROVEDORES.length);
    });

    it('carrega a lista ao abrir a aba', () => {
      montar();
      comp.tabAtual({ index: 2 });
      expect(service.getProvedoresLLM).toHaveBeenCalled();
      expect(comp.provedores.length).toBe(PROVEDORES.length);
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

  // Em 19/08 um clique que errou o `+` por poucos pixels trocou o modelo do tutor EM PRODUÇÃO
  // por um classificador de segurança, que responde 200 a tudo com {"User Safety": "safe"} — a
  // cadeia de reserva não protege disso, porque ela só reage a ERRO. A causa era a linha inteira
  // ser clicável, com o `+` colado no selo de saúde.
  describe('alvos de clique da linha do modelo', () => {
    function linhas() {
      return fixture.nativeElement.querySelectorAll('.modelo-item');
    }

    /** Linha de um modelo que não é o ativo nem já é reserva — é onde o `+` aparece. */
    function linhaLivre(): HTMLElement {
      return [...linhas()].find(
        (l: any) => !l.classList.contains('ativo') && l.querySelector('.btn-reserva')) as HTMLElement;
    }

    beforeEach(() => {
      montar();
      comp.tabAtual({ index: 1 });
      comp.saudeEmAndamento = false;
      // Os grupos nascem fechados (menos o do modelo em uso); aqui queremos ver as linhas.
      comp.fornecedoresAbertos = { meta: true, openai: true, 'z-ai': true };
      fixture.detectChanges();
    });

    it('só a área do nome troca o modelo do tutor', () => {
      const linha = linhaLivre();
      linha.click();                                  // clique na linha, fora dos controles
      expect(service.definirModeloLLM).not.toHaveBeenCalled();

      linha.querySelector<HTMLElement>('.modelo-detalhes')!.click();
      expect(service.definirModeloLLM).toHaveBeenCalled();
    });

    it('o + fica no slot da esquerda e não seleciona o modelo', () => {
      const linha = linhaLivre();
      expect(linha.querySelector('.modelo-acao .btn-reserva'))
        .withContext('o + tem de estar no slot da esquerda, longe do selo de saúde').toBeTruthy();

      linha.querySelector<HTMLElement>('.btn-reserva')!.click();
      expect(service.definirModeloLLM).not.toHaveBeenCalled();
      expect(comp.reservas.length).toBeGreaterThan(0);
    });

    it('o modelo em uso mostra "em uso" no lugar do +', () => {
      const ativa = [...linhas()].find((l: any) => l.classList.contains('ativo')) as HTMLElement;
      expect(ativa.querySelector('.selo-uso')).toBeTruthy();
      expect(ativa.querySelector('.btn-reserva')).toBeNull();
    });
  });

  // A tela responde a uma pergunta só: *qual modelo eu posso escolher agora?* Quem responde vem
  // primeiro; quem já falhou no teste de saúde desce.
  describe('ordem por saúde', () => {
    function comSaude(resultados: any) {
      montar();
      comp.tabAtual({ index: 1 });
      comp.saudeModelos = resultados;
      comp.saudeEmAndamento = false;
    }

    it('fornecedor com modelo que responde vem antes de quem não tem nenhum vivo', () => {
      // `openai/gpt-5-pro` responde; os dois da `meta` foram testados e não respondem.
      comSaude({
        'openai/gpt-5-pro': { responde: true },
        'meta/llama-3.3-70b-instruct': { responde: false, erro: 'HTTP 410' },
        'meta/llama-3.1-8b-instruct': { responde: false, erro: 'HTTP 404' },
      });
      const ordem = comp.gruposModelos.map((g) => g.fornecedor);
      expect(ordem[0]).toBe('openai');
      // a `meta` tem 2 gratuitos e mesmo assim desce: gratuito que não responde não serve
      expect(ordem.indexOf('meta')).toBeGreaterThan(0);
    });

    it('dentro do fornecedor, quem responde primeiro e quem falhou por último', () => {
      comSaude({
        'meta/llama-3.3-70b-instruct': { responde: false, erro: 'HTTP 410' },
        'meta/llama-3.1-8b-instruct': { responde: true },
      });
      const meta = comp.gruposModelos.find((g) => g.fornecedor === 'meta')!;
      expect(meta.modelos.map((m) => m.id))
        .toEqual(['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct']);
    });

    it('não-testado fica entre o que responde e o que falhou', () => {
      comSaude({
        'meta/llama-3.3-70b-instruct': { responde: false, erro: 'HTTP 410' },
        // `llama-3.1-8b` sem entrada: ainda não testado
      });
      const meta = comp.gruposModelos.find((g) => g.fornecedor === 'meta')!;
      expect(meta.modelos[0].id).toBe('meta/llama-3.1-8b-instruct');
    });

    it('ordenar não mexe na lista de origem', () => {
      const antes = ['z-ai/glm-4.5-air:free', 'meta/llama-3.3-70b-instruct',
                     'meta/llama-3.1-8b-instruct', 'openai/gpt-5-pro'];
      comSaude({ 'meta/llama-3.1-8b-instruct': { responde: true } });
      comp.gruposModelos;                       // força o getter
      expect(comp.modelosLLM.map((m) => m.id)).toEqual(antes);
    });

    it('modelo sem "/" no id agrupa pelo fornecedor declarado, não em "outros"', () => {
      // O Google AI Studio lista `gemini-3.5-flash`, sem prefixo. Sem o `owned_by`, os 51
      // modelos do Gemini cairiam todos num grupo "outros".
      montar();
      comp.tabAtual({ index: 1 });
      comp.modelosLLM = [{ id: 'gemini-3.5-flash', owned_by: 'google', gratuito: null } as any];
      comp.saudeEmAndamento = false;
      expect(comp.gruposModelos.map((g) => g.fornecedor)).toEqual(['google']);
    });

    it('sem nenhum teste, a ordem antiga (mais gratuitos primeiro) continua valendo', () => {
      comSaude({});
      const ordem = comp.gruposModelos.map((g) => g.fornecedor);
      expect(ordem[0]).toBe('meta');            // 2 gratuitos
      expect(ordem[ordem.length - 1]).toBe('openai');   // nenhum
    });
  });

  // A lista de reserva é a ordem de tentativa quando o modelo ativo não atende. Até 19/08 ela
  // era fixa no código do servidor — quando um reserva atingiu fim de vida, só um deploy podia
  // consertá-la, e o tutor passou 11 dias devolvendo erro.
  describe('lista de reserva', () => {
    it('carrega a lista do provedor ativo e de quem a definiu', () => {
      montar();
      comp.tabAtual({ index: 1 });
      expect(comp.reservas).toEqual(['meta/llama-3.1-8b-instruct']);
      expect(comp.reservasOrigem).toBe('catalogo');
    });

    it('o + acrescenta no fim, não duplica e respeita o teto', () => {
      montar();
      comp.tabAtual({ index: 1 });
      comp.reservas = [];
      comp.adicionarReserva('a');
      comp.adicionarReserva('b');
      comp.adicionarReserva('a');                    // repetido não entra
      expect(comp.reservas).toEqual(['a', 'b']);     // ordem de chegada

      comp.reservas = ['1', '2', '3', '4', '5'];     // teto
      comp.adicionarReserva('6');
      expect(comp.reservas.length).toBe(5);
    });

    it('o clique no + não troca o modelo ativo junto', () => {
      montar();
      comp.tabAtual({ index: 1 });
      const evento = jasmine.createSpyObj('Event', ['stopPropagation']);
      comp.adicionarReserva('z-ai/glm-4.5-air:free', evento);
      expect(evento.stopPropagation).toHaveBeenCalled();
    });

    it('as setas movem e param nos extremos', () => {
      montar();
      comp.tabAtual({ index: 1 });
      comp.reservas = ['a', 'b', 'c'];
      comp.moverReserva(2, -1);
      expect(comp.reservas).toEqual(['a', 'c', 'b']);
      comp.moverReserva(0, -1);                      // já é o primeiro
      expect(comp.reservas).toEqual(['a', 'c', 'b']);
      comp.moverReserva(2, 1);                       // já é o último
      expect(comp.reservas).toEqual(['a', 'c', 'b']);
    });

    it('salvar envia a ordem exata que está na tela', () => {
      montar();
      comp.tabAtual({ index: 1 });
      comp.reservas = ['segundo', 'primeiro'];
      comp.moverReserva(1, -1);
      comp.salvarReservas();
      expect(service.salvarFallbacksLLM)
        .toHaveBeenCalledWith('nvidia', ['primeiro', 'segundo']);
    });

    it('Salvar só habilita quando a ordem muda de verdade', () => {
      montar();
      comp.tabAtual({ index: 1 });
      expect(comp.reservasMudaram).toBeFalse();
      comp.moverReserva(0, 1);                        // lista de 1 item: não move nada
      expect(comp.reservasMudaram).toBeFalse();
      comp.adicionarReserva('outro');
      expect(comp.reservasMudaram).toBeTrue();
    });

    it('lista vazia é uma escolha, e vai ao servidor como tal', () => {
      montar();
      comp.tabAtual({ index: 1 });
      comp.removerReserva(0);
      comp.salvarReservas();
      expect(service.salvarFallbacksLLM).toHaveBeenCalledWith('nvidia', []);
    });

    it('voltar ao padrão usa o DELETE, não um salvar com lista vazia', () => {
      montar();
      comp.tabAtual({ index: 1 });
      comp.restaurarReservasPadrao();
      expect(service.restaurarFallbacksLLM).toHaveBeenCalledWith('nvidia');
      expect(service.salvarFallbacksLLM).not.toHaveBeenCalled();
    });

    it('denuncia reserva fora do catálogo do provedor e a que não responde', () => {
      montar();
      comp.tabAtual({ index: 1 });
      comp.reservas = ['meta/llama-3.1-8b-instruct', 'colado/de-outro-provedor'];
      expect(comp.reservaForaDoCatalogo('colado/de-outro-provedor')).toBeTrue();
      expect(comp.reservaForaDoCatalogo('meta/llama-3.1-8b-instruct')).toBeFalse();

      comp.saudeModelos = {
        'meta/llama-3.1-8b-instruct': { responde: false, erro: 'HTTP 410' },
        'colado/de-outro-provedor': { responde: false, erro: 'HTTP 404' },
      };
      expect(comp.reservasSemResposta).toBe(2);
      expect(comp.nenhumaReservaResponde).toBeTrue();   // a cadeia cai junto com o ativo
    });

    it('trocar de provedor descarta as reservas do anterior', () => {
      montar();
      comp.tabAtual({ index: 1 });
      expect(comp.reservas.length).toBe(1);
      const openrouter = { ...PROVEDORES[1], configurado: true, fallbacks: [],
                           fallbacks_origem: 'admin' } as any;
      comp.provedores = [PROVEDORES[0] as any, openrouter];
      service.definirProvedorLLMAtivo.and.returnValue(
        of({ ativo: 'openrouter', provedores: [PROVEDORES[0], openrouter] } as any));
      comp.ativarProvedor(openrouter);
      expect(comp.reservas).toEqual([]);               // a lista é POR provedor
    });

    it('o cartão aparece mesmo sem catálogo de modelos (é quando mais importa)', () => {
      montar();
      service.listarModelosLLM.and.returnValue(of({ modelos: [], modelo_atual: '' } as any));
      comp.tabAtual({ index: 1 });
      comp.reservasAberto = true;
      fixture.detectChanges();
      const cartao = fixture.nativeElement.querySelector('.reservas-card');
      expect(cartao).withContext('o provedor caiu: é aí que o admin precisa mexer').toBeTruthy();
    });

    it('a lista chega ao DOM numerada e com o botão de remover', () => {
      montar();
      comp.tabAtual({ index: 1 });
      comp.reservas = ['um', 'dois'];
      comp.reservasAberto = true;
      fixture.detectChanges();
      const itens = fixture.nativeElement.querySelectorAll('.reserva-item');
      expect(itens.length).toBe(2);
      expect(itens[0].querySelector('.ordem').textContent.trim()).toBe('1');
      expect(itens[1].querySelector('.btn-remover-reserva')).toBeTruthy();
    });

    // O primeiro deploy escondeu o cartão: nascia recolhido e o único jeito de adicionar era um
    // `+` dentro da listagem de modelos — que some enquanto o teste de saúde roda. O dono não
    // achou a tela.
    it('o cartão nasce aberto, para ser encontrado', () => {
      montar();
      comp.tabAtual({ index: 1 });
      fixture.detectChanges();
      expect(comp.reservasAberto).toBeTrue();
      expect(fixture.nativeElement.querySelector('.reservas-corpo')).toBeTruthy();
    });

    it('dá para adicionar pelo campo do cartão, sem depender da listagem', () => {
      montar();
      service.listarModelosLLM.and.returnValue(of({ modelos: [], modelo_atual: '' } as any));
      comp.tabAtual({ index: 1 });          // catálogo vazio: o `+` da listagem não existe
      comp.novaReserva = '  colado/a-mao  ';
      comp.adicionarReservaDigitada();
      expect(comp.reservas).toContain('colado/a-mao');
      expect(comp.novaReserva).toBe('');    // campo limpo para o próximo
    });

    it('avisa na tela que o modelo entrou e que falta salvar', () => {
      montar();
      comp.tabAtual({ index: 1 });
      const notificacao = TestBed.inject(NotificacaoService) as jasmine.SpyObj<NotificacaoService>;
      comp.adicionarReserva('z-ai/glm-4.5-air:free');
      // O cartão fica acima da listagem: sem aviso, quem rolou até os modelos não vê nada mudar.
      expect(notificacao.sucesso).toHaveBeenCalled();
      expect((notificacao.sucesso as jasmine.Spy).calls.mostRecent().args[0])
        .toContain('Salvar ordem');
    });

    it('campo vazio não acrescenta nada', () => {
      montar();
      comp.tabAtual({ index: 1 });
      const antes = comp.reservas.length;
      comp.novaReserva = '   ';
      comp.adicionarReservaDigitada();
      expect(comp.reservas.length).toBe(antes);
    });

    it('o histórico mostra rótulo legível para as operações novas', () => {
      montar();
      expect(comp.formatarOperacao('definiu_fallbacks')).not.toBe('definiu_fallbacks');
      expect(comp.formatarOperacao('restaurou_fallbacks')).not.toBe('restaurou_fallbacks');
    });
  });

  // Provedores hospedados têm URL fixa no catálogo do servidor (guarda anti-exfiltração: sem
  // ela, mudar a base_url levaria a chave já gravada para outro host). O campo de URL na tela
  // prometia uma edição que o servidor descartava.
  describe('formulário de provedor', () => {
    function cartao(pid: string): HTMLElement {
      return [...fixture.nativeElement.querySelectorAll('.provedor-card')]
        .find((c: any) => c.textContent.includes(pid === 'custom' ? 'Outro provedor' : 'Gemini')) as HTMLElement;
    }

    beforeEach(() => {
      montar();
      comp.tabAtual({ index: 2 });
      fixture.detectChanges();
    });

    it('só o customizado mostra URL base e porta', () => {
      expect(cartao('gemini').querySelector('.campo-form.url')).toBeNull();
      expect(cartao('custom').querySelector('.campo-form.url')).toBeTruthy();
    });

    it('todo provedor hospedado tem link para obter a chave', () => {
      expect(comp.linkDaChave('gemini')).toContain('aistudio.google.com');
      expect(comp.linkDaChave('orcarouter')).toContain('orcarouter');
      expect(comp.linkDaChave('openrouter')).toContain('openrouter');
      expect(comp.linkDaChave('custom')).toBe('');   // self-hosted: não há onde obter
    });

    // Várias chaves por provedor: o limite de taxa é POR CHAVE (o nível gratuito do AI Studio
    // dá ~500 requisições/dia, que uma turma consome numa aula).
    it('lista as chaves mascaradas e numeradas', () => {
      const itens = cartao('gemini').querySelectorAll<HTMLElement>('.chave-item');
      expect(itens.length).toBe(2);
      expect(itens[0].querySelector<HTMLElement>('.ordem')!.textContent!.trim()).toBe('1');
      expect(itens[0].querySelector<HTMLElement>('.chave-mascara')!.textContent).toContain('••••');
    });

    it('acrescentar manda a chave e limpa o campo', () => {
      comp.formProvedor['gemini'].api_key = '  AIzaNOVA  ';
      comp.adicionarChave(PROVEDORES.find((x: any) => x.id === 'gemini'));
      expect(service.adicionarChaveLLM).toHaveBeenCalledWith('gemini', 'AIzaNOVA');
      expect(comp.formProvedor['gemini'].api_key).toBe('');
    });

    it('remover é por índice, que é tudo que a tela conhece', () => {
      comp.removerChave(PROVEDORES.find((x: any) => x.id === 'gemini'), 1);
      expect(service.removerChaveLLM).toHaveBeenCalledWith('gemini', 1);
    });

    it('chave que vem do .env não pode ser removida pela tela', () => {
      const nvidia = PROVEDORES.find((x: any) => x.id === 'nvidia');
      // `chaves_no_banco: 0` e `chave_fonte: 'env'`: a única chave é do servidor.
      expect(comp.chaveDoAmbiente(nvidia, 0)).toBeTrue();
      const gemini = PROVEDORES.find((x: any) => x.id === 'gemini');
      expect(comp.chaveDoAmbiente(gemini, 0)).toBeFalse();
    });

    it('a NVIDIA também gerencia chave, apesar de não ser editável', () => {
      // `editavel: false` vale para URL e nome; a chave passou a ser da tela em 19/08.
      const card = [...fixture.nativeElement.querySelectorAll('.provedor-card')]
        .find((c: any) => c.textContent.includes('NVIDIA')) as HTMLElement;
      expect(card.querySelector('.chaves-bloco')).toBeTruthy();
      expect(card.querySelector('.campo-form.url')).toBeNull();
    });

    it('o Gemini aparece na tela e aceita chave', () => {
      const campo = cartao('gemini').querySelector('input[type=password]');
      expect(campo).withContext('o cartão do Gemini precisa aceitar a chave').toBeTruthy();
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
