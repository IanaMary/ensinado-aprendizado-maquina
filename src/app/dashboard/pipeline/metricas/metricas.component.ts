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


  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getItensMetricas().subscribe(itens => {
      this.itens = itens;
    });
  }

  // Manipulando o evento de soltar
  onItemDropped(event: any) {
    const item = event.item.data;
    event.item.data.movido = true;
    this.dashboardService.movendoItemExecucao(item);
  }
}
