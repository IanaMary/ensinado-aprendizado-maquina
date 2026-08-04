import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';
import { desistiuDoArrasto } from '../arrasto-cancelado';

@Component({
  selector: 'app-coleta-de-dados',
  templateUrl: './coleta-de-dados.component.html',
  styleUrls: ['./coleta-de-dados.component.scss'],
  standalone: false
})
export class ColetaDeDadosComponent implements OnInit {

  itens: ItemPipeline[] = [];

  constructor(
    private dashboardService: DashboardService
  ) { }

  ngOnInit() {
    this.dashboardService.getItensColetasDados()
      .subscribe((itens: ItemPipeline[]) => {
        this.itens = itens;
      });
  }

  onItemDropped(event: any) {
    // Soltar de volta sobre a paleta é desistir do arrasto, não adicionar o item.
    if (desistiuDoArrasto(event)) { return; }

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
