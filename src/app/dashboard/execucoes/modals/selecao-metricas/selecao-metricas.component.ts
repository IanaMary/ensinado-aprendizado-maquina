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
  @Output() selecaoMetricas = new EventEmitter<ItemPipeline[]>();

  metricasSelecionadas: ItemPipeline[] = [];

  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges): void { }


  toggleMetrica(metrica: ItemPipeline) {
    this.emitSelecaoMetricas();

  }

  emitSelecaoMetricas() {
    this.metricasSelecionadas = this.metricasDisponiveis.filter(e => e.movido);
    this.selecaoMetricas.emit(this.metricasSelecionadas);
  }
}
