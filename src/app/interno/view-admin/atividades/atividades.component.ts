import { Component, OnDestroy, OnInit } from '@angular/core';
import { AtividadeService } from '../../../service/atividade/atividade.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';

@Component({
  selector: 'app-atividades',
  templateUrl: './atividades.component.html',
  styleUrls: ['./atividades.component.scss'],
  standalone: false,
})
export class AtividadesComponent implements OnInit, OnDestroy {
  carregando = false;
  erro = '';

  // filtros
  filtros = {
    usuario_id: '',
    tipo: '',
    acao: '',
    status: '',
    data_inicio: '',
    data_fim: '',
  };

  tipos = ['', 'chat', 'pipeline', 'navegacao', 'http', 'ui', 'erro'];
  status = ['', 'sucesso', 'erro', 'interrompido'];

  // lista de usuários (seletor por nome/email)
  usuarios: { id: string; nome: string; email: string }[] = [];

  // paginação
  skip = 0;
  limit = 50;
  total = 0;

  itens: any[] = [];
  resumo: any = null;
  tempoPreso: any[] = [];
  mostrarTempoPreso = false;

  // auto-refresh
  autoRefresh = false;
  private readonly REFRESH_MS = 30000;
  private refreshTimer: any = null;
  exportando = false;

  constructor(private atividade: AtividadeService, private dashboard: DashboardService) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.carregarResumo();
    this.carregarTempoPreso();
    this.buscar();
  }

  ngOnDestroy(): void {
    this.pararAutoRefresh();
  }

  private carregarUsuarios(): void {
    // Conveniência para o seletor; falha silenciosa (ex.: papel sem acesso à lista).
    this.dashboard.listarUsuarios().subscribe({
      next: (us) => {
        this.usuarios = (us || []).map((u: any) => ({ id: u.id, nome: u.nome, email: u.email }));
      },
      error: () => { this.usuarios = []; },
    });
  }

  /** Converte um valor de <input datetime-local> (hora local) para ISO UTC. */
  private toIso(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  private montarFiltros(extra: Record<string, any> = {}) {
    return {
      ...this.filtros,
      data_inicio: this.toIso(this.filtros.data_inicio),
      data_fim: this.toIso(this.filtros.data_fim),
      skip: this.skip,
      limit: this.limit,
      ...extra,
    };
  }

  aplicarFiltros(): void {
    this.skip = 0;
    this.carregarResumo();
    this.carregarTempoPreso();
    this.buscar();
  }

  limparFiltros(): void {
    this.filtros = { usuario_id: '', tipo: '', acao: '', status: '', data_inicio: '', data_fim: '' };
    this.aplicarFiltros();
  }

  buscar(incluirTotal = true): void {
    this.carregando = true;
    this.erro = '';
    this.atividade.listar(this.montarFiltros({ incluir_total: incluirTotal })).subscribe({
      next: (res) => {
        this.itens = res?.itens || [];
        // total só vem quando pedido (1ª página/filtro); ao paginar, mantém o anterior.
        if (res?.total !== null && res?.total !== undefined) {
          this.total = res.total;
        }
        this.carregando = false;
      },
      error: (e) => {
        this.carregando = false;
        this.erro = e?.error?.detail || 'Falha ao carregar atividades.';
      },
    });
  }

  carregarResumo(): void {
    this.atividade
      .resumo({ data_inicio: this.toIso(this.filtros.data_inicio), data_fim: this.toIso(this.filtros.data_fim) })
      .subscribe({
        next: (r) => (this.resumo = r),
        error: () => (this.resumo = null),
      });
  }

  carregarTempoPreso(): void {
    this.atividade
      .tempoPreso({ data_inicio: this.toIso(this.filtros.data_inicio), data_fim: this.toIso(this.filtros.data_fim) })
      .subscribe({
        next: (r) => (this.tempoPreso = r?.itens || []),
        error: () => (this.tempoPreso = []),
      });
  }

  /** Atalho: filtra a lista pelos eventos de um usuário (jornada cronológica). */
  verJornada(usuarioId: string): void {
    this.filtros.usuario_id = usuarioId;
    this.aplicarFiltros();
  }

  paginaAnterior(): void {
    if (this.skip <= 0) return;
    this.skip = Math.max(0, this.skip - this.limit);
    this.buscar(false); // reaproveita o total já conhecido
  }

  proximaPagina(): void {
    if (this.skip + this.limit >= this.total) return;
    this.skip += this.limit;
    this.buscar(false);
  }

  get paginaAtual(): number {
    return Math.floor(this.skip / this.limit) + 1;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  // ---- Auto-refresh ----
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.refreshTimer = setInterval(() => {
        this.carregarResumo();
        this.buscar(this.skip === 0);
      }, this.REFRESH_MS);
    } else {
      this.pararAutoRefresh();
    }
  }

  private pararAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ---- Export CSV ----
  exportarCsv(): void {
    this.exportando = true;
    // Exporta até 200 linhas do resultado filtrado atual (sem paginar).
    this.atividade.listar(this.montarFiltros({ skip: 0, limit: 200, incluir_total: false })).subscribe({
      next: (res) => {
        const linhas = res?.itens || [];
        const csv = this.montarCsv(linhas);
        this.baixar(csv, `atividades-${new Date().toISOString().slice(0, 10)}.csv`);
        this.exportando = false;
      },
      error: () => { this.exportando = false; this.erro = 'Falha ao exportar.'; },
    });
  }

  private montarCsv(linhas: any[]): string {
    const cols = ['timestamp', 'usuario_nome', 'usuario_email', 'usuario_role', 'tipo', 'acao', 'status', 'duracao_ms', 'pipeline_id', 'erro'];
    const esc = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const head = cols.join(',');
    const body = linhas.map((l) => cols.map((c) => esc(c === 'detalhes' ? JSON.stringify(l[c]) : l[c])).join(',')).join('\n');
    return head + '\n' + body;
  }

  private baixar(conteudo: string, nome: string): void {
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatarData(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  }

  resumoDetalhes(d: any): string {
    if (!d) return '';
    try {
      const s = JSON.stringify(d);
      return s.length > 120 ? s.slice(0, 120) + '…' : s;
    } catch {
      return '';
    }
  }
}
