import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-metricas',
  templateUrl: './metricas.component.html',
  styleUrl: './metricas.component.scss',
  standalone: false
})
export class MetricasComponent {
  itens: ItemPipeline[] = [];
  metricas: ItemPipeline[] = [];
  visualizadores: ItemPipeline[] = [];

  // IDs que sao visualizadores (nao metricas numericas)
  private visualizadorIds = ['confusion_matrix'];

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getItensMetricas().subscribe(itens => {
      this.itens = itens;
      this.metricas = itens.filter(i => !this.visualizadorIds.includes(i.valor));
      this.visualizadores = itens.filter(i => this.visualizadorIds.includes(i.valor));
    });
  }

  // Manipulando o evento de soltar
  onItemDropped(event: any) {
    const item = event.item.data;
    event.item.data.movido = true;
    this.dashboardService.movendoItemExecucao(item);
  }

  onInfoClick(item: ItemPipeline, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.dashboardService.emitInfoItemClicked(item);
  }
}
