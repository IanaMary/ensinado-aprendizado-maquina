import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ItemPipeline, MediaMetrica } from '../../../../models/item-coleta-dado.model';
import { DashboardService } from '../../../services/dashboard.service';

interface GrupoMetricas {
  nome: string;
  icone: string;
  itens: ItemPipeline[];
}

@Component({
  selector: 'app-selecao-metricas',
  templateUrl: './selecao-metricas.component.html',
  styleUrls: ['./selecao-metricas.component.scss'],
  standalone: false
})
export class SelecaoMetricasComponent implements OnChanges {

  @Input() metricasDisponiveis: ItemPipeline[] = [];
  @Input() mediaMetricas: MediaMetrica = 'weighted';
  @Output() selecaoMetricas = new EventEmitter<{ metricas: ItemPipeline[]; media: MediaMetrica }>();
  /** Pedido de ajuda contextual sobre uma métrica → o modal abre no tutor/chatbot. */
  @Output() ajudaItem = new EventEmitter<ItemPipeline>();

  metricasSelecionadas: ItemPipeline[] = [];
  todasMarcadas = false;
  grupos: GrupoMetricas[] = [];
  temClassificacao = false;

  private nomesGrupos: Record<string, { nome: string; icone: string }> = {
    classificacao: { nome: 'Classificação', icone: 'category' },
    regressao: { nome: 'Regressão', icone: 'trending_up' },
    agrupamento: { nome: 'Agrupamento', icone: 'scatter_plot' },
  };

  medias: { valor: MediaMetrica; label: string; descricao: string }[] = [
    {
      valor: 'weighted',
      label: 'Weighted',
      descricao: 'Pondera cada classe pela quantidade de exemplos. É a escolha mais estável quando as classes estão desbalanceadas.'
    },
    {
      valor: 'macro',
      label: 'Macro',
      descricao: 'Calcula a métrica por classe e tira uma média simples. Dá o mesmo peso para classes raras e frequentes.'
    },
    {
      valor: 'micro',
      label: 'Micro',
      descricao: 'Soma acertos e erros de todas as classes antes de calcular a métrica. Favorece a visão global do desempenho.'
    }
  ];

  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metricasDisponiveis']) {
      this.construirGrupos();
    }
  }

  // Apenas as métricas válidas para os modelos treinados (classificação, regressão
  // ou agrupamento). Filtrar aqui mantém a lista organizada por tipo de projeto e
  // faz a agregação (micro/macro/weighted) aparecer só quando há classificação.
  private get metricasHabilitadas(): ItemPipeline[] {
    return this.metricasDisponiveis.filter(m => m.habilitado);
  }

  private construirGrupos(): void {
    const mapa = new Map<string, ItemPipeline[]>();
    for (const metrica of this.metricasDisponiveis) {
      const grupo = metrica.grupo || 'outros';
      if (!mapa.has(grupo)) {
        mapa.set(grupo, []);
      }
      mapa.get(grupo)!.push(metrica);
    }

    const ordem = ['classificacao', 'regressao', 'agrupamento', 'outros'];
    this.grupos = [];
    for (const key of ordem) {
      if (mapa.has(key)) {
        const meta = this.nomesGrupos[key] || { nome: key, icone: 'help' };
        this.grupos.push({ nome: meta.nome, icone: meta.icone, itens: mapa.get(key)! });
      }
    }

    const habilitadas = this.metricasHabilitadas;
    this.temClassificacao = habilitadas.some(m => m.grupo === 'classificacao');
    this.todasMarcadas = habilitadas.length > 0 && habilitadas.every(m => m.movido);
  }

  toggleMetrica(metrica: ItemPipeline) {
    const habilitadas = this.metricasHabilitadas;
    this.todasMarcadas = habilitadas.length > 0 && habilitadas.every(m => m.movido);
    this.emitSelecaoMetricas();
  }

  pedirAjuda(event: Event, metrica: ItemPipeline) {
    event.stopPropagation();
    event.preventDefault();
    this.ajudaItem.emit(metrica);
  }

  grupoTemHabilitada(grupo: GrupoMetricas): boolean {
    return grupo.itens.some(m => m.habilitado);
  }

  toggleTodas() {
    this.todasMarcadas = !this.todasMarcadas;
    this.metricasHabilitadas.forEach(m => m.movido = this.todasMarcadas);
    this.emitSelecaoMetricas();
  }

  toggleGrupo(grupo: GrupoMetricas) {
    const habilitadasDoGrupo = grupo.itens.filter(m => m.habilitado);
    const todasDoGrupoMarcadas = habilitadasDoGrupo.length > 0 && habilitadasDoGrupo.every(m => m.movido);
    habilitadasDoGrupo.forEach(m => m.movido = !todasDoGrupoMarcadas);
    const todasHabilitadas = this.metricasHabilitadas;
    this.todasMarcadas = todasHabilitadas.length > 0 && todasHabilitadas.every(m => m.movido);
    this.emitSelecaoMetricas();
  }

  atualizarMedia(media: MediaMetrica) {
    this.mediaMetricas = media;
    this.emitSelecaoMetricas();
  }

  emitSelecaoMetricas() {
    this.metricasSelecionadas = this.metricasHabilitadas
      .filter(e => e.movido)
      .map(e => ({ ...e, average: this.mediaMetricas }));
    this.selecaoMetricas.emit({ metricas: this.metricasSelecionadas, media: this.mediaMetricas });
  }
}
