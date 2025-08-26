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
  metricasMap: { item: ItemPipeline; movido: boolean }[] = [];


  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges): void { }


  toggleMetrica(metrica: ItemPipeline) {
    this.metricasSelecionadas = this.dashboardService.selecionarMetricas(metrica);
    this.emitSelecaoMetricas();

  }

  emitSelecaoMetricas() {
    this.selecaoMetricas.emit(this.metricasSelecionadas);
  }
}
