import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { ArtefatosService } from '../../../service/artefatos/artefatos.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';

@Component({
  selector: 'app-artefatos',
  templateUrl: './artefatos.component.html',
  styleUrls: ['./artefatos.component.scss'],
  standalone: false,
})
export class ArtefatosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private buscaUsuario$ = new Subject<string>();
  carregando = false;
  erro = '';

  // filtros (usuário, modelo, papel, período)
  filtros = { usuario_id: '', modelo: '', papel: '', dataset: '', data_inicio: '', data_fim: '' };
  // autocomplete de usuário (busca no servidor — escala p/ milhares de alunos)
  usuarioBusca = '';
  usuariosSugeridos: { id: string; nome: string; email: string }[] = [];
  modelosDisponiveis: string[] = [];
  papeisDisponiveis: string[] = [];
  datasetsDisponiveis: string[] = [];
  readonly papelLabel: Record<string, string> = { aluno: 'Aluno', professor: 'Professor', admin: 'Admin' };

  // paginação
  skip = 0;
  limit = 50;
  total = 0;
  itens: any[] = [];

  // detalhe da run selecionada
  runSelecionada: string | null = null;
  carregandoDetalhe = false;
  erroDetalhe = '';
  resumo: any = null;
  runIdCopiado = false;
  contextoVinculos: any[] = [];
  modeloIdSelecionado: string | null = null;
  modeloNomeSelecionado: string | null = null;
  baixandoModelo = false;

  @HostListener('document:keydown.escape')
  aoApertarEsc(): void { if (this.runSelecionada) this.fecharDetalhe(); }

  constructor(private artefatos: ArtefatosService, private dashboard: DashboardService, private router: Router) {}

  abrirTurma(turmaId: string): void {
    if (turmaId) this.router.navigate(['/view-professor/turmas', turmaId]);
  }

  ngOnInit(): void {
    this.carregarFacetas();
    this.buscar();
    // Busca de usuário debounced no servidor (só quando há texto).
    this.buscaUsuario$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((q) => (q.trim().length >= 1 ? this.artefatos.buscarUsuarios(q.trim()) : of([]))),
      takeUntil(this.destroy$),
    ).subscribe((res) => (this.usuariosSugeridos = res || []));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  onBuscaUsuario(texto: string): void {
    if (!texto || !texto.trim()) { this.filtros.usuario_id = ''; this.usuariosSugeridos = []; }
    this.buscaUsuario$.next(texto || '');
  }

  rotuloUsuario(u: { nome: string; email: string }): string {
    return `${u.nome}${u.email ? ' · ' + u.email : ''}`;
  }

  escolherUsuario(u: { id: string; nome: string; email: string }): void {
    // O texto exibido é escrito pelo autocomplete (value = rótulo); aqui só guardamos o id.
    this.filtros.usuario_id = u.id;
  }

  modelosFiltrados(): string[] {
    const q = (this.filtros.modelo || '').toLowerCase();
    return q ? this.modelosDisponiveis.filter((m) => m.toLowerCase().includes(q)) : this.modelosDisponiveis;
  }

  private carregarFacetas(): void {
    this.artefatos.getFacetas().subscribe({
      next: (f) => {
        this.modelosDisponiveis = f?.modelos || [];
        this.papeisDisponiveis = f?.papeis || [];
        this.datasetsDisponiveis = f?.datasets || [];
      },
      error: () => { this.modelosDisponiveis = []; this.papeisDisponiveis = []; this.datasetsDisponiveis = []; },
    });
  }

  private toIso(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  private montarFiltros() {
    return {
      usuario_id: this.filtros.usuario_id,
      modelo: this.filtros.modelo,
      papel: this.filtros.papel,
      dataset: this.filtros.dataset,
      data_inicio: this.toIso(this.filtros.data_inicio),
      data_fim: this.toIso(this.filtros.data_fim),
      skip: this.skip,
      limit: this.limit,
    };
  }

  aplicarFiltros(): void {
    this.skip = 0;
    this.buscar();
  }

  limparFiltros(): void {
    this.filtros = { usuario_id: '', modelo: '', papel: '', dataset: '', data_inicio: '', data_fim: '' };
    this.usuarioBusca = '';
    this.usuariosSugeridos = [];
    this.aplicarFiltros();
  }

  buscar(): void {
    this.carregando = true;
    this.erro = '';
    this.artefatos.listar(this.montarFiltros()).subscribe({
      next: (res) => {
        this.itens = res?.itens || [];
        this.total = res?.total ?? 0;
        this.carregando = false;
      },
      error: (e) => {
        this.carregando = false;
        this.erro = e?.status === 403 ? 'Acesso restrito a administradores e professores.' : (e?.error?.detail || 'Falha ao listar artefatos.');
      },
    });
  }

  paginaAnterior(): void {
    if (this.skip <= 0) return;
    this.skip = Math.max(0, this.skip - this.limit);
    this.buscar();
  }

  proximaPagina(): void {
    if (this.skip + this.limit >= this.total) return;
    this.skip += this.limit;
    this.buscar();
  }

  get paginaAtual(): number {
    return Math.floor(this.skip / this.limit) + 1;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  // ---- detalhe ----
  verDetalhe(runId: string): void {
    if (!runId) return;
    this.runSelecionada = runId;   // abre o painel lateral (drawer)
    this.carregandoDetalhe = true;
    this.erroDetalhe = '';
    this.resumo = null;
    this.contextoVinculos = [];
    const item = this.itens.find((i) => i.run_id === runId);
    this.modeloIdSelecionado = item?.modelo_id || null;
    this.modeloNomeSelecionado = item?.modelo || null;
    this.artefatos.contextoRun(runId).subscribe({
      next: (c) => (this.contextoVinculos = c?.vinculos || []),
      error: () => (this.contextoVinculos = []),
    });
    this.artefatos.obterRun(runId).subscribe({
      next: (r) => {
        this.resumo = r;
        this.carregandoDetalhe = false;
      },
      error: (e) => {
        this.carregandoDetalhe = false;
        const s = e?.status;
        this.erroDetalhe =
          s === 503 ? 'O MLflow não está configurado no servidor.'
          : s === 404 ? 'Run não encontrada.'
          : s === 400 ? 'run_id inválido.'
          : (e?.error?.detail || 'Falha ao buscar o resumo da run.');
      },
    });
  }

  baixarModelo(): void {
    if (!this.modeloIdSelecionado || this.baixandoModelo) return;
    this.baixandoModelo = true;
    this.dashboard.baixarModeloArtefato(this.modeloIdSelecionado).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nome = (this.modeloNomeSelecionado || 'modelo').replace(/[^\w.-]+/g, '_');
        a.download = `modelo-${nome}-${(this.runSelecionada || '').slice(0, 8)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        this.baixandoModelo = false;
      },
      error: () => {
        this.baixandoModelo = false;
        this.erroDetalhe = 'Não foi possível baixar o modelo desta run (pode ter sido removido).';
      },
    });
  }

  copiarRunId(runId: string | null): void {
    if (!runId) return;
    navigator.clipboard?.writeText(runId).then(() => {
      this.runIdCopiado = true;
      setTimeout(() => (this.runIdCopiado = false), 1500);
    }).catch(() => {});
  }

  fecharDetalhe(): void {
    this.runSelecionada = null;
    this.resumo = null;
    this.erroDetalhe = '';
  }

  // ---- helpers ----
  entries(obj: any): { chave: string; valor: any }[] {
    if (!obj) return [];
    return Object.keys(obj).map((k) => ({ chave: k, valor: obj[k] }));
  }

  formatarData(valor: any): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    try {
      return new Date(valor).toLocaleString('pt-BR');
    } catch {
      return String(valor);
    }
  }

  formatarTamanho(bytes: number | null): string {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
