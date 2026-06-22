import { Component, OnInit } from '@angular/core';
import { AtividadeService } from '../../../service/atividade/atividade.service';

@Component({
  selector: 'app-atividades',
  templateUrl: './atividades.component.html',
  styleUrls: ['./atividades.component.scss'],
  standalone: false,
})
export class AtividadesComponent implements OnInit {
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
  status = ['', 'sucesso', 'erro'];

  // paginação
  skip = 0;
  limit = 50;
  total = 0;

  itens: any[] = [];
  resumo: any = null;

  constructor(private atividade: AtividadeService) {}

  ngOnInit(): void {
    this.carregarResumo();
    this.buscar();
  }

  /** Converte um valor de <input datetime-local> (hora local) para ISO UTC. */
  private toIso(local: string): string {
    if (!local) return '';
    const d = new Date(local);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  }

  private montarFiltros(extra: { [k: string]: any } = {}) {
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
    this.buscar();
  }

  limparFiltros(): void {
    this.filtros = { usuario_id: '', tipo: '', acao: '', status: '', data_inicio: '', data_fim: '' };
    this.aplicarFiltros();
  }

  buscar(incluirTotal: boolean = true): void {
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
