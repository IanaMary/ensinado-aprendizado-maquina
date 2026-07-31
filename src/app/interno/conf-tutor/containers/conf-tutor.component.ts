import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth/auth.service';
import { LoginService } from '../../../externo/autenticacao/login/services/login.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService, ModeloLLM, ProvedorLLM } from '../../../dashboard/services/dashboard.service';
import { htmlParaBoasVindas, mesmoConteudo, QUILL_MODULOS_BOAS_VINDAS } from './html-boas-vindas';
import { NotificacaoService } from '../../../service/notificacao.service';

// Mapeia o indice da aba para o slug "pipe" usado no backend/audit log.
// O catálogo (dados/pré-proc/modelos/métricas) é administrado no conf-pipeline.
const TAB_PIPES = [
  'inicio',   // texto de boas-vindas do tutor (area de trabalho)
  'llm',      // modelo do LLM
  'llm',      // provedores — mesmo histórico da aba LLM (é a mesma família de configuração)
];

const OPERACOES_LABEL: Record<string, string> = {
  atualizar_descricao: 'Atualização de texto',
  atualizar_modelos: 'Atualização de modelos',
  atualizar_chaves_fixas: 'Atualização de chaves',
  atualizar_por_pipe: 'Atualização de texto',
  editou: 'Edição da instrução do tutor',
  restaurou_padrao: 'Instrução do tutor restaurada ao padrão',
  seed_padrao: 'Padrão do sistema aplicado no deploy',
  forcou: 'Padrão do sistema reaplicado à força',
  definiu_modelo: 'Modelo do tutor trocado',
  trocou_provedor: 'Provedor de LLM trocado',
  configurou_provedor: 'Provedor de LLM configurado',
};

/** Fornecedor do modelo = o que vem antes da "/" no id (nvidia, google, meta, z-ai…). */
function fornecedorDoModelo(id: string): string {
  const corte = (id || '').indexOf('/');
  return corte > 0 ? id.slice(0, corte) : 'outros';
}

/** Um grupo colapsável da listagem. */
export interface GrupoModelos {
  fornecedor: string;
  modelos: ModeloLLM[];
  gratuitos: number;
  respondem: number;
}

@Component({
  selector: 'app-conf-tutor',
  templateUrl: './conf-tutor.component.html',
  styleUrls: ['./conf-tutor.component.scss'],
  standalone: false,
})
export class ConfTutorComponent implements OnInit, OnDestroy {

  role: string = sessionStorage.getItem('role') || '';

  tabs = [true, false, false];
  /** Aba visível (ligada ao mat-tab-group): permite navegar por código, ex. do link
   *  "Configurar provedores" da aba LLM. */
  abaSelecionada = 0;

  formConfTutorInicio: FormGroup;

  // Historico de edicoes
  historico: any[] = [];
  historicoAberto = true;
  carregandoHistorico = false;
  pipeAtual: string = TAB_PIPES[0];

  // Configuracao LLM
  modelosLLM: ModeloLLM[] = [];
  modeloLLMAtual = '';
  carregandoModelos = false;
  salvandoModelo = false;

  // Instrução de sistema do chat. O texto é persistido no banco (semeado a partir da fonte
  // versionada no deploy); o versionado é o padrão de onde ele parte e o fallback de leitura.
  promptTexto = '';
  promptPadrao = '';
  promptPersonalizado = false;
  promptLimite = 6000;
  /** 'banco' = persistido; 'versionado' = caiu no fallback (o seed não rodou). */
  promptFonte = '';
  /** 'versionado' | 'admin' — de quem é o texto que está no ar. */
  promptOrigem = '';
  /** O padrão do repo mudou depois que o admin editou o dele. */
  promptPadraoDesatualizado = false;
  carregandoPrompt = false;
  salvandoPrompt = false;
  /** Guarda a busca já feita. Antes a condição era `!this.promptTexto`, ou seja, o CONTEÚDO:
   *  se o admin limpasse o textarea e trocasse de aba, a volta refazia o GET por cima do que ele
   *  estava editando — e o estado de versão só era lido uma vez por carga de página. */
  promptCarregado = false;

  // Editor visual das boas-vindas (Quill). O admin não precisa saber HTML; quem quiser ver o
  // código tem o modo "código HTML".
  editorHtml = false;
  quillModules = QUILL_MODULOS_BOAS_VINDAS;
  /** Texto como veio do banco: serve para saber se houve edição de verdade. */
  private inicioCarregado = '';

  // Provedores de LLM (aba Provedores)
  provedores: ProvedorLLM[] = [];
  provedorAtivo = '';
  carregandoProvedores = false;
  salvandoProvedor = '';
  /** Rascunho por provedor: o que está nos campos da tela antes de salvar. */
  formProvedor: Record<string, { nome: string; base_url: string; porta: number | null; api_key: string }> = {};

  // Busca e agrupamento da listagem de modelos
  buscaModelo = '';
  /** Fornecedores expandidos. Com centenas de modelos, o padrão é tudo fechado — só o grupo do
   *  modelo em uso abre sozinho, para o admin ver de imediato o que está no ar. */
  fornecedoresAbertos: Record<string, boolean> = {};
  testandoModelo = '';

  // Health-check dos modelos (testado em segundo plano no backend)
  // `| undefined`: indexar um Record por chave ausente devolve undefined em runtime, e é o que
  // justifica o `?.` na listagem (sem isto o compilador o acusava de redundante).
  saudeModelos: Record<string, { responde: boolean; latencia_ms?: number; erro?: string } | undefined> = {};
  saudeEmAndamento = false;
  saudeProgresso = { concluidos: 0, total: 0 };
  // A lista de inativos fica recolhida por padrão (o foco é escolher um que responde).
  inativosAberto = false;
  private saudeTimer: any = null;
  private destruido = false;

  constructor(private readonly loginService: LoginService,
    private readonly formBuilder: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly notificacao: NotificacaoService,
    private dashboardService: DashboardService) {

    this.formConfTutorInicio = this.formBuilder.group({
      texto_pipe: ['', [Validators.required]],
      explicacao: [null, []]
    });
  }


  // Texto de boas-vindas (pipe 'inicio')
  carregandoInicio = false;
  salvandoInicio = false;

  ngOnInit() {
    this.carregarHistorico(this.pipeAtual);
    this.carregarInicio();
  }

  tabAtual(e: any) {
    const idx = e.index;
    if (!this.tabs[idx]) {
      this.tabs[idx] = true;
    }
    this.pipeAtual = TAB_PIPES[idx] || TAB_PIPES[0];
    this.carregarHistorico(this.pipeAtual);

    if (this.pipeAtual === 'llm' && !this.promptCarregado) {
      this.carregarPrompt();
    }
    if (this.pipeAtual === 'llm' && !this.modelosLLM.length) {
      this.carregarModelosLLM();
    }
    // Abas LLM e Provedores: as duas precisam da lista. Antes só a aba Provedores carregava, então
    // o seletor de provedor da aba LLM (que é `*ngIf="provedores.length"`) não existia até o admin
    // visitar a outra aba.
    if ((idx === 1 || idx === 2) && !this.provedores.length) {
      this.carregarProvedores();
    }
  }

  // === Texto de boas-vindas do tutor (pipe 'inicio') ===

  carregarInicio() {
    this.carregandoInicio = true;
    this.dashboardService.getTutorEditar({ pipe: 'inicio' }).subscribe({
      next: (doc: any) => {
        const texto = doc?.texto_pipe || '';
        this.inicioCarregado = texto;
        this.formConfTutorInicio.patchValue({ texto_pipe: texto, explicacao: doc?.explicacao || null });
        // `patchValue` não suja o form, e é isso que queremos: abrir a aba não é editar. Sem essa
        // distinção, o editor normaliza o HTML ao carregar e um Salvar sem intenção marcaria o
        // texto como "do admin" — que é o que faz ele parar de receber as atualizações do sistema.
        this.formConfTutorInicio.markAsPristine();
        this.carregandoInicio = false;
      },
      error: () => { this.carregandoInicio = false; }
    });
  }

  salvarInicio() {
    if (this.formConfTutorInicio.invalid || this.salvandoInicio || !this.inicioMudou) return;
    this.salvandoInicio = true;
    const { explicacao } = this.formConfTutorInicio.value;
    // Converte o HTML do editor para o subconjunto que o painel do aluno renderiza — sem isto,
    // a lista com marcador do Quill 2 (`<ol data-list="bullet">`) apareceria numerada lá.
    const texto_pipe = htmlParaBoasVindas(this.formConfTutorInicio.value?.texto_pipe || '');
    this.dashboardService.putTutorPipe('inicio', { texto_pipe, explicacao }).subscribe({
      next: () => {
        this.salvandoInicio = false;
        this.inicioCarregado = texto_pipe;
        this.formConfTutorInicio.patchValue({ texto_pipe }, { emitEvent: false });
        this.formConfTutorInicio.markAsPristine();
        this.notificacao.sucesso('Texto de boas-vindas salvo com sucesso.');
        this.carregarHistorico(this.pipeAtual);
      },
      error: (err: any) => {
        this.salvandoInicio = false;
        this.notificacao.erro(err.error?.detail || 'Erro ao salvar o texto de boas-vindas.');
      }
    });
  }

  /** Houve edição de verdade? Compara o conteúdo, não o HTML byte a byte: o editor reserializa o
   *  texto ao carregar, e sem isso o Salvar viveria habilitado sem nada para salvar. */
  get inicioMudou(): boolean {
    const atual = htmlParaBoasVindas(this.formConfTutorInicio.value?.texto_pipe || '');
    return !mesmoConteudo(atual, this.inicioCarregado);
  }

  /** Alterna entre o editor visual e o código HTML, normalizando ao sair do visual (assim o que se
   *  vê no código é exatamente o que será salvo). */
  alternarModoHtml(): void {
    if (!this.editorHtml) {
      const normalizado = htmlParaBoasVindas(this.formConfTutorInicio.value?.texto_pipe || '');
      this.formConfTutorInicio.patchValue({ texto_pipe: normalizado }, { emitEvent: false });
    }
    this.editorHtml = !this.editorHtml;
  }

  get previewInicio(): string {
    // Passa pela mesma conversão do salvamento: sem isso o admin via a lista numerada e os
    // `&nbsp;` que o editor produz e que o `htmlParaBoasVindas` remove — ou seja, uma prévia do
    // que NÃO seria gravado.
    return htmlParaBoasVindas(this.formConfTutorInicio.value?.texto_pipe || '');
  }

  recarregarHistorico() {
    this.carregarHistorico(this.pipeAtual);
  }

  private carregarHistorico(pipe: string) {
    this.carregandoHistorico = true;
    this.dashboardService.getTutorAudit(pipe, 20).subscribe({
      next: (entradas: any[]) => {
        this.historico = entradas || [];
        this.carregandoHistorico = false;
      },
      error: () => {
        this.historico = [];
        this.carregandoHistorico = false;
      }
    });
  }

  // === Instrução de sistema do chat ===

  carregarPrompt(): void {
    this.carregandoPrompt = true;
    this.dashboardService.getSystemPrompt().subscribe({
      next: (res: any) => {
        this.promptTexto = res?.texto || '';
        this.promptPadrao = res?.padrao || '';
        this.promptPersonalizado = !!res?.personalizado;
        this.promptLimite = res?.limite || this.promptLimite;
        this.promptFonte = res?.fonte || '';
        this.promptOrigem = res?.origem || '';
        this.promptPadraoDesatualizado = !!res?.padrao_desatualizado;
        this.promptCarregado = true;
        this.carregandoPrompt = false;
      },
      error: (err: any) => {
        this.notificacao.erro(err?.error?.detail || 'Erro ao carregar a instrução do tutor.');
        this.carregandoPrompt = false;
      },
    });
  }

  /** Tamanho que o SERVIDOR vai validar (ele grava o texto com strip). */
  get promptTamanho(): number {
    return this.promptTexto.trim().length;
  }

  salvarPrompt(): void {
    const texto = this.promptTexto.trim();
    if (!texto || texto.length > this.promptLimite) return;
    this.salvandoPrompt = true;
    this.dashboardService.putSystemPrompt(texto).subscribe({
      next: (res: any) => {
        this.promptTexto = res?.texto || texto;
        this.promptPersonalizado = !!res?.personalizado;
        // Acabou de gravar: está no banco, e o texto passou a derivar do padrão de agora.
        this.promptFonte = 'banco';
        this.promptOrigem = res?.personalizado ? 'admin' : 'versionado';
        this.promptPadraoDesatualizado = false;
        this.salvandoPrompt = false;
        this.notificacao.sucesso('Instrução do tutor salva. Vale já na próxima pergunta.');
        this.carregarHistorico(this.pipeAtual);
      },
      error: (err: any) => {
        this.notificacao.erro(err?.error?.detail || 'Erro ao salvar a instrução do tutor.');
        this.salvandoPrompt = false;
      },
    });
  }

  /** Texto vazio no PUT = o backend GRAVA o padrão versionado (não apaga o documento) e guarda
   *  o texto anterior no histórico. O `confirm` existe porque o botão fica ao lado de "Salvar":
   *  um clique sem intenção tira do ar a instrução que o admin escreveu. */
  restaurarPromptPadrao(): void {
    if (this.promptPersonalizado &&
        !confirm('Voltar ao padrão do sistema? Sua instrução atual sai do ar e fica registrada ' +
                 'no histórico desta tela.')) {
      return;
    }
    this.salvandoPrompt = true;
    this.dashboardService.putSystemPrompt('').subscribe({
      next: (res: any) => {
        this.promptTexto = res?.texto || this.promptPadrao;
        this.promptPersonalizado = false;
        this.promptFonte = 'banco';
        this.promptOrigem = 'versionado';
        this.promptPadraoDesatualizado = false;
        this.salvandoPrompt = false;
        this.notificacao.sucesso('Instrução do tutor de volta ao padrão do sistema.');
        this.carregarHistorico(this.pipeAtual);
      },
      error: (err: any) => {
        this.notificacao.erro(err?.error?.detail || 'Erro ao restaurar a instrução do tutor.');
        this.salvandoPrompt = false;
      },
    });
  }

  // === LLM Model Management ===

  carregarModelosLLM() {
    this.carregandoModelos = true;
    this.dashboardService.listarModelosLLM().subscribe({
      next: (res) => {
        this.modelosLLM = res.modelos || [];
        this.modeloLLMAtual = res.modelo_atual || '';
        if (res.provedor) { this.provedorAtivo = res.provedor.id; }
        this.carregandoModelos = false;
        this.verificarSaudeModelos();
      },
      error: (err) => {
        this.notificacao.erro(err.error?.detail || 'Erro ao carregar modelos LLM.');
        this.carregandoModelos = false;
      }
    });
  }

  // Pergunta ao backend quais modelos respondem (teste em segundo plano). Enquanto o
  // teste roda, faz polling para mostrar o progresso na listagem.
  verificarSaudeModelos(forcar = false) {
    if (this.saudeTimer) { clearTimeout(this.saudeTimer); this.saudeTimer = null; }
    this.dashboardService.verificarSaudeModelos(forcar).subscribe({
      next: (res) => {
        this.saudeModelos = res.resultados || {};
        this.saudeEmAndamento = res.em_andamento;
        this.saudeProgresso = { concluidos: res.concluidos, total: res.total };
        if (res.em_andamento && !this.destruido) {
          this.saudeTimer = setTimeout(() => this.verificarSaudeModelos(), 3000);
        }
      },
      error: () => { this.saudeEmAndamento = false; },
    });
  }

  retestarModelos() {
    this.saudeModelos = {};
    // Bloqueia a seleção imediatamente (sem flicker) enquanto o backend re-testa.
    this.saudeEmAndamento = true;
    this.saudeProgresso = { concluidos: 0, total: this.modelosLLM.length };
    this.verificarSaudeModelos(true);
  }

  /** 'responde' | 'sem-resposta' | 'testando' para o chip de status na listagem. */
  statusModelo(id: string): 'responde' | 'sem-resposta' | 'testando' {
    const s = this.saudeModelos[id];
    if (!s) return 'testando';
    return s.responde ? 'responde' : 'sem-resposta';
  }

  // Enquanto o teste roda, a seleção fica bloqueada e mostramos um progresso.
  get verificandoSaude(): boolean {
    return this.saudeEmAndamento;
  }

  /**
   * A listagem pode ser mostrada: não há teste em curso.
   *
   * NÃO depende de "algum modelo foi testado". Num provedor que não informa preço (endpoint
   * customizado), nada entra no teste automático — e exigir `total > 0` deixava a tela vazia com
   * centenas de modelos carregados, sem como escolher o primeiro.
   */
  get verificacaoConcluida(): boolean {
    return !this.saudeEmAndamento;
  }

  /** Nenhum modelo foi testado automaticamente (provedor sem informação de preço). */
  get nenhumTesteAutomatico(): boolean {
    return this.saudeProgresso.total === 0 && !this.saudeEmAndamento && !!this.modelosLLM.length;
  }

  get progressoPct(): number {
    const { concluidos, total } = this.saudeProgresso;
    return total > 0 ? Math.round((concluidos / total) * 100) : 0;
  }

  get modelosAtivos(): ModeloLLM[] {
    return this.modelosLLM.filter((m) => this.saudeModelos[m.id]?.responde);
  }

  get modelosInativos(): ModeloLLM[] {
    return this.modelosLLM.filter((m) => {
      const s = this.saudeModelos[m.id];
      return s && !s.responde;
    });
  }

  /** Modelos que casam com a busca (por id ou fornecedor). */
  get modelosFiltrados(): ModeloLLM[] {
    const termo = this.buscaModelo.trim().toLowerCase();
    if (!termo) return this.modelosLLM;
    return this.modelosLLM.filter(
      (m) => m.id.toLowerCase().includes(termo) || (m.owned_by || '').toLowerCase().includes(termo));
  }

  /**
   * Listagem agrupada pelo fornecedor do modelo (o que vem antes da "/").
   *
   * Com 367 modelos no OpenRouter, uma lista plana é inutilizável. Grupos com modelo gratuito vêm
   * primeiro (mesma regra do backend, que já entrega os gratuitos na frente dentro de cada
   * fornecedor); dentro do grupo, a ordem do backend é preservada.
   */
  get gruposModelos(): GrupoModelos[] {
    const porFornecedor = new Map<string, ModeloLLM[]>();
    for (const m of this.modelosFiltrados) {
      const f = fornecedorDoModelo(m.id);
      (porFornecedor.get(f) || porFornecedor.set(f, []).get(f)!).push(m);
    }
    const grupos: GrupoModelos[] = [];
    porFornecedor.forEach((modelos, fornecedor) => grupos.push({
      fornecedor,
      modelos,
      gratuitos: modelos.filter((m) => m.gratuito === true).length,
      respondem: modelos.filter((m) => this.saudeModelos[m.id]?.responde).length,
    }));
    // Mais gratuitos primeiro (não só "tem ≥1": um fornecedor com 40 gratuitos vinha depois de um
    // com 1), e alfabético para desempatar — a lista não pode dançar entre recarregamentos.
    grupos.sort((a, b) => (b.gratuitos - a.gratuitos)
      || a.fornecedor.localeCompare(b.fornecedor));
    return grupos;
  }

  /**
   * Aberto quando: o admin abriu explicitamente; há busca em curso (o resultado precisa ficar
   * visível); ou é o grupo do modelo em uso.
   *
   * O estado explícito vence a busca — antes a busca forçava `true` e o botão de recolher parava
   * de responder enquanto havia filtro.
   */
  grupoAberto(fornecedor: string): boolean {
    const explicito = this.fornecedoresAbertos[fornecedor];
    if (explicito !== undefined) return explicito;
    if (this.buscaModelo.trim()) return true;
    return fornecedorDoModelo(this.modeloLLMAtual) === fornecedor;
  }

  toggleFornecedor(fornecedor: string): void {
    this.fornecedoresAbertos[fornecedor] = !this.grupoAberto(fornecedor);
  }

  limparBusca(): void {
    this.buscaModelo = '';
  }

  /** Testa um modelo isolado — os pagos ficam fora do teste automático. */
  testarModelo(id: string, evento?: Event): void {
    evento?.stopPropagation();
    if (this.testandoModelo) return;
    this.testandoModelo = id;
    this.dashboardService.verificarSaudeModelos(false, id).subscribe({
      next: (res) => { this.saudeModelos = res.resultados || this.saudeModelos; this.testandoModelo = ''; },
      error: () => { this.testandoModelo = ''; },
    });
  }

  /** `true` quando o modelo nunca foi testado (fica sem selo, em vez de "testando" para sempre). */
  naoTestado(id: string): boolean {
    return !this.saudeModelos[id];
  }

  toggleInativos(): void {
    this.inativosAberto = !this.inativosAberto;
  }

  // === Provedores de LLM ===

  carregarProvedores(): void {
    this.carregandoProvedores = true;
    this.dashboardService.getProvedoresLLM().subscribe({
      next: (res) => { this.aplicarProvedores(res); this.carregandoProvedores = false; },
      // O `ErrorInterceptor` já mostra um toast com o `detail` da resposta — repetir aqui daria
      // dois avisos para o mesmo erro (bug já registrado no CLAUDE.md).
      error: () => { this.carregandoProvedores = false; },
    });
  }

  private aplicarProvedores(res: { ativo: string; provedores: ProvedorLLM[] }): void {
    this.provedores = res.provedores || [];
    this.provedorAtivo = res.ativo || '';
    for (const p of this.provedores) {
      // O rascunho nasce com o que está gravado, MENOS a chave: a tela não a conhece, e um campo
      // pré-preenchido com asteriscos convidaria a reenviar lixo por cima do segredo.
      if (!this.formProvedor[p.id]) {
        this.formProvedor[p.id] = { nome: p.nome, base_url: p.base_url, porta: null, api_key: '' };
      }
    }
  }

  salvarProvedor(p: ProvedorLLM): void {
    const form = this.formProvedor[p.id];
    if (!form || this.salvandoProvedor) return;
    this.salvandoProvedor = p.id;
    this.dashboardService.salvarProvedorLLM(p.id, {
      nome: form.nome || undefined,
      base_url: form.base_url || undefined,
      porta: form.porta || undefined,
      api_key: form.api_key || undefined,     // vazio = manter a chave atual
    }).subscribe({
      next: (res) => {
        this.aplicarProvedores(res);
        this.formProvedor[p.id].api_key = '';   // não deixa o segredo no DOM depois de salvar
        this.salvandoProvedor = '';
        this.notificacao.sucesso(`${p.nome} configurado.`);
        this.carregarHistorico(this.pipeAtual);
      },
      error: () => { this.salvandoProvedor = ''; },
    });
  }

  ativarProvedor(p: ProvedorLLM): void {
    if (this.salvandoProvedor || p.id === this.provedorAtivo) return;
    this.salvandoProvedor = p.id;
    this.dashboardService.definirProvedorLLMAtivo(p.id).subscribe({
      next: (res) => {
        this.aplicarProvedores(res);
        this.salvandoProvedor = '';
        this.notificacao.sucesso(`${p.nome} passou a responder o chat do tutor.`);
        // Modelos e saúde são POR provedor: a lista de antes não vale mais.
        this.modelosLLM = [];
        this.saudeModelos = {};
        this.saudeProgresso = { concluidos: 0, total: 0 };
        this.fornecedoresAbertos = {};
        this.buscaModelo = '';
        this.carregarModelosLLM();
        this.carregarHistorico(this.pipeAtual);
      },
      error: () => { this.salvandoProvedor = ''; },
    });
  }

  /** Troca pelo seletor da aba LLM (o `select` já mostra o novo valor; o efeito vem do backend). */
  trocarProvedorPeloSeletor(id: string): void {
    const p = this.provedores.find((x) => x.id === id);
    if (!p || p.id === this.provedorAtivo) return;
    if (!p.configurado) {
      this.notificacao.erro(`${p.nome} ainda não tem chave de API configurada.`);
      return;
    }
    this.ativarProvedor(p);
  }

  /** Leva para a aba Provedores (índice 2). */
  irParaProvedores(): void {
    this.tabs[2] = true;
    this.abaSelecionada = 2;
    this.tabAtual({ index: 2 });
  }

  get provedorAtivoNome(): string {
    return this.provedores.find((p) => p.id === this.provedorAtivo)?.nome || '';
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.saudeTimer) clearTimeout(this.saudeTimer);
  }

  selecionarModeloLLM(modeloId: string) {
    // Bloqueia a troca enquanto o teste de saúde está em andamento.
    if (this.salvandoModelo || this.saudeEmAndamento || modeloId === this.modeloLLMAtual) return;
    this.salvandoModelo = true;
    this.dashboardService.definirModeloLLM(modeloId).subscribe({
      next: (res) => {
        this.modeloLLMAtual = res.modelo;
        this.salvandoModelo = false;
        this.notificacao.sucesso('Modelo LLM atualizado com sucesso.');
      },
      error: (err) => {
        this.notificacao.erro(err.error?.detail || 'Erro ao salvar modelo LLM.');
        this.salvandoModelo = false;
      }
    });
  }

  formatarTimestamp(ts: string | null): string {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return ts;
    }
  }

  formatarOperacao(op: string): string {
    return OPERACOES_LABEL[op] || op;
  }

  irParaConfPipeline() {
    this.router.navigate(['/view-admin/conf-pipeline']);
  }

  navegar(bool: boolean) {
    if (bool) {
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      this.auth.limparSessionStorage();
      this.router.navigate(['/autenticacao/login']);
    }
  }
}
