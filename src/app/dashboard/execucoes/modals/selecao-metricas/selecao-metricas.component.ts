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

  metricasSelecionadas: ItemPipeline[] = [];
  todasMarcadas: boolean = false;
  grupos: GrupoMetricas[] = [];
  temClassificacao: boolean = false;
  metricaExpandida: ItemPipeline | null = null;

  private nomesGrupos: Record<string, { nome: string; icone: string }> = {
    classificacao: { nome: 'Classificação', icone: 'category' },
    regressao: { nome: 'Regressão', icone: 'trending_up' },
    agrupamento: { nome: 'Agrupamento', icone: 'scatter_plot' },
  };

  medias: Array<{ valor: MediaMetrica; label: string; descricao: string }> = [
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

    this.temClassificacao = mapa.has('classificacao');
    this.todasMarcadas = this.metricasDisponiveis.length > 0 && this.metricasDisponiveis.every(m => m.movido);
  }

  toggleMetrica(metrica: ItemPipeline) {
    this.todasMarcadas = this.metricasDisponiveis.every(m => m.movido);
    this.emitSelecaoMetricas();
  }

  toggleExplicacao(event: Event, metrica: ItemPipeline) {
    event.stopPropagation();
    event.preventDefault();
    this.metricaExpandida = this.metricaExpandida === metrica ? null : metrica;
  }

  toggleTodas() {
    this.todasMarcadas = !this.todasMarcadas;
    this.metricasDisponiveis.forEach(m => m.movido = this.todasMarcadas);
    this.emitSelecaoMetricas();
  }

  toggleGrupo(grupo: GrupoMetricas) {
    const todasDoGrupoMarcadas = grupo.itens.every(m => m.movido);
    grupo.itens.forEach(m => m.movido = !todasDoGrupoMarcadas);
    this.todasMarcadas = this.metricasDisponiveis.every(m => m.movido);
    this.emitSelecaoMetricas();
  }

  atualizarMedia(media: MediaMetrica) {
    this.mediaMetricas = media;
    this.emitSelecaoMetricas();
  }

  emitSelecaoMetricas() {
    this.metricasSelecionadas = this.metricasDisponiveis
      .filter(e => e.movido)
      .map(e => ({ ...e, average: this.mediaMetricas }));
    this.selecaoMetricas.emit({ metricas: this.metricasSelecionadas, media: this.mediaMetricas });
  }
}
