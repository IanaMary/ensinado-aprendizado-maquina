import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth/auth.service';
import { LoginService } from '../../../externo/autenticacao/login/services/login.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../service/notificacao.service';

// Mapeia o indice da aba para o slug "pipe" usado no backend/audit log.
// O catálogo (dados/pré-proc/modelos/métricas) é administrado no conf-pipeline.
const TAB_PIPES = [
  'inicio',   // texto de boas-vindas do tutor (area de trabalho)
  'llm',      // configuracao do LLM
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
};

@Component({
  selector: 'app-conf-tutor',
  templateUrl: './conf-tutor.component.html',
  styleUrls: ['./conf-tutor.component.scss'],
  standalone: false,
})
export class ConfTutorComponent implements OnInit, OnDestroy {

  role: string = sessionStorage.getItem('role') || '';

  tabs = [true, false];

  formConfTutorInicio: FormGroup;

  // Historico de edicoes
  historico: any[] = [];
  historicoAberto = true;
  carregandoHistorico = false;
  pipeAtual: string = TAB_PIPES[0];

  // Configuracao LLM
  modelosLLM: { id: string; owned_by: string }[] = [];
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

  // Health-check dos modelos (testado em segundo plano no backend)
  saudeModelos: Record<string, { responde: boolean; latencia_ms?: number; erro?: string }> = {};
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
  }

  // === Texto de boas-vindas do tutor (pipe 'inicio') ===

  carregarInicio() {
    this.carregandoInicio = true;
    this.dashboardService.getTutorEditar({ pipe: 'inicio' }).subscribe({
      next: (doc: any) => {
        this.formConfTutorInicio.patchValue({
          texto_pipe: doc?.texto_pipe || '',
          explicacao: doc?.explicacao || null,
        });
        this.carregandoInicio = false;
      },
      error: () => { this.carregandoInicio = false; }
    });
  }

  salvarInicio() {
    if (this.formConfTutorInicio.invalid || this.salvandoInicio) return;
    this.salvandoInicio = true;
    const { texto_pipe, explicacao } = this.formConfTutorInicio.value;
    this.dashboardService.putTutorPipe('inicio', { texto_pipe, explicacao }).subscribe({
      next: () => {
        this.salvandoInicio = false;
        this.notificacao.sucesso('Texto de boas-vindas salvo com sucesso.');
        this.carregarHistorico(this.pipeAtual);
      },
      error: (err: any) => {
        this.salvandoInicio = false;
        this.notificacao.erro(err.error?.detail || 'Erro ao salvar o texto de boas-vindas.');
      }
    });
  }

  get previewInicio(): string {
    return this.formConfTutorInicio.value?.texto_pipe || '';
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

  // Teste concluído: já dá para separar ativos/inativos e permitir a seleção.
  get verificacaoConcluida(): boolean {
    return !this.saudeEmAndamento && this.saudeProgresso.total > 0;
  }

  get progressoPct(): number {
    const { concluidos, total } = this.saudeProgresso;
    return total > 0 ? Math.round((concluidos / total) * 100) : 0;
  }

  get modelosAtivos(): { id: string; owned_by: string }[] {
    return this.modelosLLM.filter((m) => this.saudeModelos[m.id]?.responde);
  }

  get modelosInativos(): { id: string; owned_by: string }[] {
    return this.modelosLLM.filter((m) => {
      const s = this.saudeModelos[m.id];
      return s && !s.responde;
    });
  }

  toggleInativos(): void {
    this.inativosAberto = !this.inativosAberto;
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
