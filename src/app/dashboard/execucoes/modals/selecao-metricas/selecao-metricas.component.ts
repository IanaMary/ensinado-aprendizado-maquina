import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ItemPipeline, MediaMetrica } from '../../../../models/item-coleta-dado.model';
import { DashboardService } from '../../../services/dashboard.service';

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

  ngOnChanges(changes: SimpleChanges): void { }

  toggleMetrica(metrica: ItemPipeline) {
    this.todasMarcadas = this.metricasDisponiveis.every(m => m.movido);
    this.emitSelecaoMetricas();
  }

  toggleTodas() {
    this.todasMarcadas = !this.todasMarcadas;
    this.metricasDisponiveis.forEach(m => m.movido = this.todasMarcadas);
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
