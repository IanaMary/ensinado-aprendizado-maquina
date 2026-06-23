import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth/auth.service';
import { LoginService } from '../../../externo/autenticacao/login/services/login.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../service/notificacao.service';
import { BodyTutor } from '../../../models/item-coleta-dado.model';

// Mapeia o indice da aba para o slug "pipe" usado no backend/audit log.
const TAB_PIPES = [
  'coleta_dados',        // dados (catalogo)
  'pre_processamento',   // pre-processamento (catalogo)
  'modelos',             // modelos (catalogo)
  'metricas',            // metricas (catalogo)
  'llm',                 // configuracao do LLM
];

const OPERACOES_LABEL: Record<string, string> = {
  atualizar_descricao: 'Atualização de texto',
  atualizar_modelos: 'Atualização de modelos',
  atualizar_chaves_fixas: 'Atualização de chaves',
};

@Component({
  selector: 'app-conf-tutor',
  templateUrl: './conf-tutor.component.html',
  styleUrls: ['./conf-tutor.component.scss'],
  standalone: false,
})
export class ConfTutorComponent implements OnInit, OnDestroy {

  role: string = sessionStorage.getItem('role') || '';

  conteudo = '';

  body: BodyTutor = {
    tamanho_arq: 0
  };

  tabs = [true, false, false, false, false];

  erroTutor = false;

  formConfTutor: FormGroup;
  formConfTutor2: FormGroup;

  // Historico de edicoes
  historico: any[] = [];
  historicoAberto = true;
  carregandoHistorico = false;
  pipeAtual: string = TAB_PIPES[0];

  // Configuracao LLM
  modelosLLM: { id: string; owned_by: string }[] = [];
  modeloLLMAtual: string = '';
  carregandoModelos = false;
  salvandoModelo = false;

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

    this.formConfTutor = this.formBuilder.group({
      tamanho_arq: [0, [Validators.required]],
      prever_categoria: [null, []],
      dados_rotulados: [null, []],
      num_categorias_conhecidas: [null, []],
      prever_quantidade: [null, []],
      apenas_olhando: [null, []],
    });

    this.formConfTutor2 = this.formBuilder.group({
      formConfTutorInicio: this.formBuilder.group({
        explicacao: [null, [Validators.required]]
      }),
      formConfTutorColetaDados: this.formBuilder.group({
        planilha_treino: [null, [Validators.required]],
        planilha_teste: [null, [Validators.required]],
        divisao_entre_treino_teste: [null, [Validators.required]],
        target: [null, [Validators.required]],
        atributos: [null, [Validators.required]]
      }),
      formConfTutorSelecaoModelo: this.formBuilder.group({
        aprendizado_supervisionado: [null, [Validators.required]],
        classificacao: [null, [Validators.required]],
        modelos_classificacao: this.formBuilder.array([]),
        regressao: [null, [Validators.required]],
        modelos_regressao: this.formBuilder.array([]),
        aprendizado_nao_supervisionado: [null, [Validators.required]],
        reducao_dimensionalidade: [null, [Validators.required]],
        agrupamento: [null, [Validators.required]]
      })
    });
  }


  ngOnInit() {
    this.carregarHistorico(this.pipeAtual);
  }

  tabAtual(e: any) {
    const idx = e.index;
    if (!this.tabs[idx]) {
      this.tabs[idx] = true;
    }
    this.pipeAtual = TAB_PIPES[idx] || TAB_PIPES[0];
    this.carregarHistorico(this.pipeAtual);

    if (this.pipeAtual === 'llm' && !this.modelosLLM.length) {
      this.carregarModelosLLM();
    }
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

  get formConfTutorInicio(): FormGroup {
    return this.formConfTutor2.get('formConfTutorInicio') as FormGroup;
  }

  get formConfTutorColetaDados(): FormGroup {
    return this.formConfTutor2.get('formConfTutorColetaDados') as FormGroup;
  }

  get formConfTutorSelecaoModelo(): FormGroup {
    return this.formConfTutor2.get('formConfTutorSelecaoModelo') as FormGroup;
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
