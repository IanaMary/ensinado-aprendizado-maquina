import { Component, OnInit } from '@angular/core';
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
  novaAtiv = { titulo: '', descricao: '', datasetNome: '', metrica: 'accuracy_score', ordem: 'desc' };
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
    this.criandoAtiv = true;
    this.turmaService.criarAtividade(this.turmaId, {
      titulo: this.novaAtiv.titulo.trim(),
      descricao: this.novaAtiv.descricao.trim() || undefined,
      template: { datasetNome: this.novaAtiv.datasetNome || undefined },
      criterio: { metrica: this.novaAtiv.metrica, ordem: met?.ordem || 'desc' },
    }).subscribe({
      next: (a) => {
        this.atividades.unshift(a); this.criandoAtiv = false;
        this.novaAtiv = { titulo: '', descricao: '', datasetNome: '', metrica: 'accuracy_score', ordem: 'desc' };
        this.snackBar.open('Atividade criada.', 'Fechar', { duration: 3000 });
      },
      error: () => { this.criandoAtiv = false; },
    });
  }

  excluirAtividade(a: Atividade): void {
    this.turmaService.excluirAtividade(this.turmaId, a.id).subscribe({
      next: () => { this.atividades = this.atividades.filter(x => x.id !== a.id); if (this.rankingAtiv?.id === a.id) this.rankingAtiv = undefined; },
    });
  }

  verRanking(a: Atividade): void {
    this.rankingAtiv = a; this.ranking = []; this.rankingMetrica = a.criterio?.metrica || '';
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
    this.turmaService.historicoAlunoChat(this.chatAlunoId, chatId).subscribe({ next: (c) => this.chatAberto = c });
  }

  fecharChats(): void { this.chatAlunoId = ''; this.chats = []; this.chatAberto = null; }

  fmtValor(v: any): string {
    if (typeof v !== 'number') return '—';
    return Number.isInteger(v) ? String(v) : v.toFixed(4);
  }
}
