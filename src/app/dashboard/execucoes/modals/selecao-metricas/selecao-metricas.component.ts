import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ItemPipeline } from '../../../../models/item-coleta-dado.model';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-selecao-metricas',
  templateUrl: './selecao-metricas.component.html',
  styleUrls: ['./selecao-metricas.component.scss'],
  standalone: false
})
export class SelecaoMetricasComponent implements OnChanges {

  @Input() metricasDisponiveis: ItemPipeline[] = [];
  @Input() metricasSelecionadas: ItemPipeline[] = [];
  @Output() selecaoMetricas = new EventEmitter<ItemPipeline[]>();

  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.sincronizarMetricas();
  }

  sincronizarMetricas() {
    this.metricasDisponiveis.forEach(metrica => {
      metrica.habilitado = this.metricasSelecionadas.some(selecionada => selecionada.valor === metrica.valor);
    });
  }

  toggleMetrica(metrica: ItemPipeline) {
    metrica.movido = !metrica.movido;

    if (metrica.movido) {
      this.metricasSelecionadas.push(metrica);
    } else {
      this.metricasSelecionadas = this.metricasSelecionadas.filter(m => m.valor !== metrica.valor);
    }
    this.dashboardService.selecionarMetricas(metrica);
    this.emitSelecaoMetricas();
  }

  emitSelecaoMetricas() {
    this.selecaoMetricas.emit( this.metricasSelecionadas);
  }
}
