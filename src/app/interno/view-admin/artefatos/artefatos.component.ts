import { Component, OnInit } from '@angular/core';
import { ArtefatosService } from '../../../service/artefatos/artefatos.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';

@Component({
  selector: 'app-artefatos',
  templateUrl: './artefatos.component.html',
  styleUrls: ['./artefatos.component.scss'],
  standalone: false,
})
export class ArtefatosComponent implements OnInit {
  carregando = false;
  erro = '';

  // filtros (busca por usuário e por data)
  filtros = { usuario_id: '', data_inicio: '', data_fim: '' };
  usuarios: { id: string; nome: string; email: string }[] = [];

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

  constructor(private artefatos: ArtefatosService, private dashboard: DashboardService) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.buscar();
  }

  private carregarUsuarios(): void {
    this.dashboard.listarUsuarios().subscribe({
      next: (us) => (this.usuarios = (us || []).map((u: any) => ({ id: u.id, nome: u.nome, email: u.email }))),
      error: () => (this.usuarios = []),
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
    this.filtros = { usuario_id: '', data_inicio: '', data_fim: '' };
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
    this.runSelecionada = runId;
    this.carregandoDetalhe = true;
    this.erroDetalhe = '';
    this.resumo = null;
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
