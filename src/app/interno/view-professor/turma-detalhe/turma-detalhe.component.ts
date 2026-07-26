import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as QRCode from 'qrcode';
import { TurmaService, Turma, Atividade, LaneDesafio, PerfilDatasetDesafio } from '../../../service/turma.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';

@Component({
  selector: 'app-turma-detalhe',
  templateUrl: './turma-detalhe.component.html',
  styleUrls: ['./turma-detalhe.component.scss'],
  standalone: false,
})
export class TurmaDetalheComponent implements OnInit {
  turmaId = '';
  turma?: Turma;
  atividades: Atividade[] = [];
  carregando = true;

  // entrada / QR
  linkEntrada = '';
  qrDataUrl = '';

  // adicionar aluno
  emailAluno = '';

  // criar atividade
  criandoAtiv = false;
  novaAtiv = {
    titulo: '', descricao: '', datasetNome: '', metrica: 'accuracy_score', ordem: 'desc',
    // Desafio de montagem: nasce de um dataset de exemplo. A tarefa vem dele (o servidor
    // decide), e as características da base são lidas do dataframe — o professor ajusta.
    tipo: 'pipeline' as 'pipeline' | 'montagem',
    dataset: '',
    tarefa: 'classificacao' as 'classificacao' | 'regressao' | 'agrupamento',
    dificuldade: 'medio' as 'facil' | 'medio' | 'dificil',
    // 'sortear': o sistema escolhe as peças úteis; 'escolher': valem as do professor.
    modoPecas: 'sortear' as 'sortear' | 'escolher',
    exigePreProcessamento: false,
    faltantes: false,
    texto: false,
    escalasDiferentes: false,
    fixar: [] as string[],
    vetar: [] as string[],
  };
  /** Peças do catálogo, com a lane e a compatibilidade (para filtrar pela tarefa). */
  pecas: { valor: string; label: string; lane: LaneDesafio; tarefa?: string; grupo?: string }[] = [];
  /** Perfil do dataset escolhido: descreve a tarefa e a base para o professor. */
  perfil?: PerfilDatasetDesafio;
  carregandoPerfil = false;
  lanesDesafio: { lane: LaneDesafio; titulo: string }[] = [
    { lane: 'coleta', titulo: 'Coleta' },
    { lane: 'pre_processamento', titulo: 'Pré-processamento' },
    { lane: 'modelo', titulo: 'Modelo' },
    { lane: 'metrica', titulo: 'Métrica' },
  ];
  rotulosTarefa: Record<string, string> = {
    classificacao: 'Classificação (prever uma categoria)',
    regressao: 'Regressão (prever um número)',
    agrupamento: 'Agrupamento (descobrir grupos)',
  };
  dificuldades = [
    { valor: 'facil', label: 'Fácil (2 peças que não servem)' },
    { valor: 'medio', label: 'Médio (4 peças que não servem)' },
    { valor: 'dificil', label: 'Difícil (6 peças que não servem)' },
  ];
  datasets: { id: string; nome: string; label?: string; tipo?: string }[] = [];
  metricas = [
    { valor: 'accuracy_score', label: 'Acurácia (classificação)', ordem: 'desc' },
    { valor: 'f1_score', label: 'F1 (classificação)', ordem: 'desc' },
    { valor: 'r2_score', label: 'R² (regressão)', ordem: 'desc' },
    { valor: 'mean_absolute_error', label: 'MAE (regressão, menor é melhor)', ordem: 'asc' },
    { valor: 'silhouette_score', label: 'Silhueta (agrupamento)', ordem: 'desc' },
  ];

  // ranking / chat (seções sob demanda)
  rankingAtiv?: Atividade;
  ranking: any[] = [];
  rankingMetrica = '';
  progresso: any[] = [];
  chatAlunoId = '';
  chatAlunoNome = '';
  chats: any[] = [];
  chatAberto: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private turmaService: TurmaService,
    private dashboard: DashboardService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.turmaId = this.route.snapshot.paramMap.get('id') || '';
    this.carregar();
    this.dashboard.getToyDatasets().subscribe({
      next: (ds: any[]) => this.datasets = (ds || []).map(d => ({
        id: d.id || d.valor || d.nome || d,
        nome: d.nome || d,
        label: d.label || d.nome || d,
        tipo: d.tipo,
      })),
      error: () => {},
    });
    this.carregarPecas();
  }

  /** Peças que o professor pode escolher (ou vetar). Reusa os catálogos já publicados pelo
   * DashboardService — a mesma lista que o aluno vê no pipeline — guardando a lane e a
   * compatibilidade de cada peça, para filtrar pela tarefa do dataset. */
  private carregarPecas(): void {
    const acumular = (lane: LaneDesafio) => (itens: any[]) => {
      const novas = (itens || [])
        .filter(i => i?.valor && i?.habilitado !== false)
        // `label` é o rótulo do catálogo; `nome` cobre docs antigos; o slug é último recurso.
        .map(i => ({
          valor: i.valor as string,
          label: (i.label || i.nome || i.valor) as string,
          lane,
          // Mesma convenção do backend (app/desafios/catalogo.py): sem rótulo é agrupamento,
          // senão o tipo do alvo decide.
          tarefa: lane === 'modelo' ? this.tarefaDoModelo(i) : undefined,
          grupo: lane === 'metrica' ? (i.grupo || undefined) : undefined,
        }));
      const vistos = new Set(this.pecas.map(p => p.valor));
      this.pecas = [...this.pecas, ...novas.filter(p => !vistos.has(p.valor))]
        .sort((a, b) => a.label.localeCompare(b.label));
    };
    this.dashboard.carregarItensPreProcessamento();
    this.dashboard.carregarItensModelos();
    this.dashboard.carregarItensMetricas();
    // Coleta vem da rota do catálogo (o observable do dashboard colapsa tudo num item "Dados").
    this.dashboard.fetchItensColetasDados().subscribe({ next: acumular('coleta'), error: () => {} });
    this.dashboard.getItensPreProcessamento().subscribe({ next: acumular('pre_processamento'), error: () => {} });
    this.dashboard.getModelos().subscribe({ next: acumular('modelo'), error: () => {} });
    this.dashboard.getItensMetricas().subscribe({ next: acumular('metrica'), error: () => {} });
  }

  private tarefaDoModelo(doc: any): string {
    const rotulados = doc?.dadosRotulados ?? doc?.dados_rotulados;
    if (rotulados === false) return 'agrupamento';
    const categoria = doc?.preverCategoria ?? doc?.prever_categoria ?? true;
    return categoria ? 'classificacao' : 'regressao';
  }

  /** Peças de uma lane que fazem sentido para a tarefa do dataset escolhido. */
  pecasDaLane(lane: LaneDesafio): { valor: string; label: string }[] {
    return this.pecas.filter(p => {
      if (p.lane !== lane) return false;
      if (lane === 'modelo') return p.tarefa === this.novaAtiv.tarefa;
      // Métrica sem `grupo` no catálogo entra: o backend a trata como compatível.
      if (lane === 'metrica') return !p.grupo || p.grupo === this.novaAtiv.tarefa;
      return true;
    });
  }

  pecaEscolhida(valor: string): boolean {
    return this.novaAtiv.fixar.includes(valor);
  }

  alternarPeca(valor: string): void {
    this.novaAtiv.fixar = this.pecaEscolhida(valor)
      ? this.novaAtiv.fixar.filter(v => v !== valor)
      : [...this.novaAtiv.fixar, valor];
  }

  /** Dataset escolhido → tarefa, enunciado sugerido e características da base.
   *  O servidor é a fonte: ele lê o dataframe e derivará a tarefa de novo ao salvar. */
  onDatasetDesafioChange(): void {
    const id = this.novaAtiv.dataset;
    this.perfil = undefined;
    // Peças escolhidas para outra tarefa deixam de fazer sentido.
    this.novaAtiv.fixar = [];
    if (!id) return;
    this.carregandoPerfil = true;
    this.dashboard.getPerfilDesafioDataset(id).subscribe({
      next: (p: PerfilDatasetDesafio) => {
        this.carregandoPerfil = false;
        this.perfil = p;
        this.novaAtiv.tarefa = p.tarefa;
        this.novaAtiv.faltantes = !!p.dados?.faltantes;
        this.novaAtiv.texto = !!p.dados?.texto;
        this.novaAtiv.escalasDiferentes = !!p.dados?.escalas_diferentes;
        // Não sobrescreve o que o professor já escreveu.
        if (!this.novaAtiv.descricao.trim() && p.enunciado_sugerido) {
          this.novaAtiv.descricao = p.enunciado_sugerido;
        }
        if (!this.novaAtiv.titulo.trim()) {
          this.novaAtiv.titulo = `Desafio: ${p.nome}`;
        }
      },
      error: () => {
        this.carregandoPerfil = false;
        this.snackBar.open('Não foi possível ler o dataset agora. Você pode seguir e ajustar à mão.',
                           'Fechar', { duration: 4000 });
      },
    });
  }

  carregar(): void {
    this.carregando = true;
    this.turmaService.obterTurma(this.turmaId).subscribe({
      next: (t) => {
        this.turma = t;
        // base real da SPA (ex.: https://absapt.tk/h2ia/tutor/) + rota de entrada.
        this.linkEntrada = `${document.baseURI}view-aluno/entrar?codigo=${t.codigo}`;
        QRCode.toDataURL(this.linkEntrada, { width: 200, margin: 1 }).then(u => this.qrDataUrl = u).catch(() => {});
        this.carregando = false;
      },
      error: () => { this.carregando = false; },
    });
    this.turmaService.listarAtividades(this.turmaId).subscribe({ next: (a) => this.atividades = a || [] });
    this.carregarProgresso();
  }

  voltar(): void { this.router.navigate(['/view-professor']); }

  copiarLink(): void {
    navigator.clipboard?.writeText(this.linkEntrada).then(
      () => this.snackBar.open('Link copiado.', 'Fechar', { duration: 2500 }), () => {});
  }

  adicionarAluno(): void {
    const email = this.emailAluno.trim();
    if (!email) return;
    this.turmaService.adicionarAlunos(this.turmaId, [email]).subscribe({
      next: (t) => { this.turma = t; this.emailAluno = ''; this.carregar(); },
      error: () => this.snackBar.open('Não foi possível adicionar (o aluno já tem conta?).', 'Fechar', { duration: 4000 }),
    });
  }

  removerAluno(id: string): void {
    this.turmaService.removerAluno(this.turmaId, id).subscribe({ next: () => this.carregar() });
  }

  criarAtividade(): void {
    if (!this.podeCriarAtividade) return;
    const met = this.metricas.find(m => m.valor === this.novaAtiv.metrica);
    const ehMontagem = this.novaAtiv.tipo === 'montagem';
    this.criandoAtiv = true;
    this.turmaService.criarAtividade(this.turmaId, {
      titulo: this.novaAtiv.titulo.trim(),
      descricao: this.novaAtiv.descricao.trim() || undefined,
      tipo: this.novaAtiv.tipo,
      template: ehMontagem ? {} : { datasetNome: this.novaAtiv.datasetNome || undefined },
      gabarito: ehMontagem ? this.montarGabarito() : undefined,
      criterio: { metrica: this.novaAtiv.metrica, ordem: met?.ordem || 'desc' },
    }).subscribe({
      next: (a) => {
        this.atividades.unshift(a); this.criandoAtiv = false;
        this.resetarNovaAtividade();
        this.snackBar.open(ehMontagem ? 'Desafio criado.' : 'Atividade criada.', 'Fechar',
                           { duration: 3000 });
      },
      error: () => { this.criandoAtiv = false; },
    });
  }

  /** Gabarito do desafio: o que a rubrica vai cobrar (não é a solução). */
  montarGabarito() {
    const exige: ('coleta' | 'pre_processamento' | 'modelo' | 'metrica')[] = ['coleta', 'modelo', 'metrica'];
    // Só exigimos a lane de pré-processamento quando o professor marca — ou quando a base
    // descrita obriga (dado faltante/texto precisam de bloco, senão a regra seria injusta).
    if (this.novaAtiv.exigePreProcessamento || this.novaAtiv.faltantes || this.novaAtiv.texto) {
      exige.splice(1, 0, 'pre_processamento');
    }
    return {
      // O servidor deriva a tarefa deste dataset; mandamos a nossa só como fallback.
      dataset: this.novaAtiv.dataset || null,
      tarefa: this.novaAtiv.tarefa,
      exige,
      dados: {
        faltantes: this.novaAtiv.faltantes,
        texto: this.novaAtiv.texto,
        escalas_diferentes: this.novaAtiv.escalasDiferentes,
      },
      dificuldade: this.novaAtiv.dificuldade,
      // 'escolher' = valem só as peças do professor (+ o mínimo que o servidor garante).
      sortear_pecas: this.novaAtiv.modoPecas === 'sortear',
      // Peça escolhida sempre entra no tabuleiro; vetada nunca aparece.
      fixar: [...this.novaAtiv.fixar],
      vetar: [...this.novaAtiv.vetar],
    };
  }

  /** Desafio precisa de uma base: é dela que saem tarefa, enunciado e peças compatíveis. */
  get podeCriarAtividade(): boolean {
    if (!this.novaAtiv.titulo.trim()) return false;
    return this.novaAtiv.tipo !== 'montagem' || !!this.novaAtiv.dataset;
  }

  private resetarNovaAtividade(): void {
    this.novaAtiv = {
      titulo: '', descricao: '', datasetNome: '', metrica: 'accuracy_score', ordem: 'desc',
      tipo: 'pipeline', dataset: '', tarefa: 'classificacao', dificuldade: 'medio',
      modoPecas: 'sortear',
      exigePreProcessamento: false, faltantes: false, texto: false, escalasDiferentes: false,
      fixar: [], vetar: [],
    };
    this.perfil = undefined;
  }

  ehDesafio(a?: Atividade): boolean {
    return a?.tipo === 'montagem';
  }

  /** Nome legível da base de um desafio já criado (o gabarito guarda o id). */
  nomeDataset(id?: string | null): string {
    if (!id) return '';
    return this.datasets.find(d => d.id === id)?.nome || id;
  }

  excluirAtividade(a: Atividade): void {
    this.turmaService.excluirAtividade(this.turmaId, a.id).subscribe({
      next: () => { this.atividades = this.atividades.filter(x => x.id !== a.id); if (this.rankingAtiv?.id === a.id) this.rankingAtiv = undefined; },
    });
  }

  verRanking(a: Atividade): void {
    this.rankingAtiv = a; this.ranking = [];
    // Desafio ranqueia por NOTA (0–10) e traz tentativas; pipeline segue pela métrica.
    this.rankingMetrica = this.ehDesafio(a) ? 'nota' : (a.criterio?.metrica || '');
    this.turmaService.ranking(this.turmaId, a.id).subscribe({
      next: (r) => { this.ranking = r?.ranking || []; this.rankingMetrica = r?.metrica || this.rankingMetrica; },
    });
  }

  carregarProgresso(): void {
    this.turmaService.progresso(this.turmaId).subscribe({ next: (p) => this.progresso = p?.alunos || [] });
  }

  verChats(alunoId: string, nome: string): void {
    this.chatAlunoId = alunoId; this.chatAlunoNome = nome; this.chats = []; this.chatAberto = null;
    this.turmaService.historicoAluno(alunoId).subscribe({
      next: (c) => this.chats = c || [],
      error: () => this.snackBar.open('Sem conversas ou acesso negado.', 'Fechar', { duration: 3500 }),
    });
  }

  abrirChat(chatId: string): void {
    this.turmaService.historicoAlunoChat(this.chatAlunoId, chatId).subscribe({ next: (c) => {
      this.chatAberto = c;
      // O botão clicado é destruído pelo *ngIf; sem isto o foco cai no <body>, FORA do
      // trap do diálogo, e o Tab passa a interagir com a página atrás do backdrop.
      this.focarNoDialogo('.voltar-chat');
    } });
  }

  /** Volta do transcript para a lista devolvendo o foco a um elemento vivo do diálogo. */
  voltarLista(): void {
    this.chatAberto = null;
    this.focarNoDialogo('.chat-item');
  }

  private focarNoDialogo(seletor: string): void {
    setTimeout(() => {
      const alvo = document.querySelector<HTMLElement>(`.chat-dialog ${seletor}`)
        ?? document.querySelector<HTMLElement>('.chat-dialog .btn-mini');
      alvo?.focus();
    });
  }

  fecharChats(): void { this.chatAlunoId = ''; this.chats = []; this.chatAberto = null; }

  @HostListener('document:keydown.escape')
  aoApertarEsc(): void {
    if (this.chatAberto) this.voltarLista();       // volta à lista
    else if (this.chatAlunoId) this.fecharChats(); // fecha o modal
  }

  /** Valor da linha do ranking: nota de desafio é 0–10 (1 decimal); métrica mantém 4. */
  fmtRanking(v: any): string {
    if (!this.ehDesafio(this.rankingAtiv)) { return this.fmtValor(v); }
    return typeof v === 'number' ? v.toFixed(1) : '—';
  }

  fmtValor(v: any): string {
    if (typeof v !== 'number') return '—';
    return Number.isInteger(v) ? String(v) : v.toFixed(4);
  }
}
