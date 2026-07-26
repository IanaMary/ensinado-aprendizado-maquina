import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as QRCode from 'qrcode';
import { TurmaService, Turma, Atividade } from '../../../service/turma.service';
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
    // Desafio de montagem: tarefa + características da base descritas no enunciado
    // (o desafio não executa nada, então são essas flags que ligam as regras da rubrica).
    tipo: 'pipeline' as 'pipeline' | 'montagem',
    tarefa: 'classificacao' as 'classificacao' | 'regressao' | 'agrupamento',
    dificuldade: 'medio' as 'facil' | 'medio' | 'dificil',
    exigePreProcessamento: false,
    faltantes: false,
    texto: false,
    escalasDiferentes: false,
  };
  tarefas = [
    { valor: 'classificacao', label: 'Classificação (qual categoria?)' },
    { valor: 'regressao', label: 'Regressão (qual número?)' },
    { valor: 'agrupamento', label: 'Agrupamento (que grupos existem?)' },
  ];
  dificuldades = [
    { valor: 'facil', label: 'Fácil (2 peças que não servem)' },
    { valor: 'medio', label: 'Médio (4 peças que não servem)' },
    { valor: 'dificil', label: 'Difícil (6 peças que não servem)' },
  ];
  datasets: { nome: string; label?: string }[] = [];
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
      next: (ds: any[]) => this.datasets = (ds || []).map(d => ({ nome: d.nome || d, label: d.label || d.nome || d })),
      error: () => {},
    });
  }

  carregar(): void {
    this.carregando = true;
    this.turmaService.obterTurma(this.turmaId).subscribe({
      next: (t) => {
        this.turma = t;
        // base real da SPA (ex.: https://absapt.tk/h2ia/tutor/) + rota de entrada.
        this.linkEntrada = `${document.baseURI}entrar?codigo=${t.codigo}`;
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
    if (!this.novaAtiv.titulo.trim()) return;
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
  private montarGabarito() {
    const exige: ('coleta' | 'pre_processamento' | 'modelo' | 'metrica')[] = ['coleta', 'modelo', 'metrica'];
    // Só exigimos a lane de pré-processamento quando o professor marca — ou quando a base
    // descrita obriga (dado faltante/texto precisam de bloco, senão a regra seria injusta).
    if (this.novaAtiv.exigePreProcessamento || this.novaAtiv.faltantes || this.novaAtiv.texto) {
      exige.splice(1, 0, 'pre_processamento');
    }
    return {
      tarefa: this.novaAtiv.tarefa,
      exige,
      dados: {
        faltantes: this.novaAtiv.faltantes,
        texto: this.novaAtiv.texto,
        escalas_diferentes: this.novaAtiv.escalasDiferentes,
      },
      dificuldade: this.novaAtiv.dificuldade,
      regras: [],
      fixar: [],
      vetar: [],
    };
  }

  private resetarNovaAtividade(): void {
    this.novaAtiv = {
      titulo: '', descricao: '', datasetNome: '', metrica: 'accuracy_score', ordem: 'desc',
      tipo: 'pipeline', tarefa: 'classificacao', dificuldade: 'medio',
      exigePreProcessamento: false, faltantes: false, texto: false, escalasDiferentes: false,
    };
  }

  ehDesafio(a?: Atividade): boolean {
    return a?.tipo === 'montagem';
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

  fmtValor(v: any): string {
    if (typeof v !== 'number') return '—';
    return Number.isInteger(v) ? String(v) : v.toFixed(4);
  }
}
