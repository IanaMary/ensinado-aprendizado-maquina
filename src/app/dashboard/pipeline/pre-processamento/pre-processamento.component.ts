import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-pre-processamento',
  templateUrl: './pre-processamento.component.html',
  styleUrl: './pre-processamento.component.scss',
  standalone: false
})
export class PreProcessamentoComponent {
  itens: ItemPipeline[] = [];

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getItensPreProcessamento().subscribe(itens => {
      this.itens = itens;
    });
  }

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
