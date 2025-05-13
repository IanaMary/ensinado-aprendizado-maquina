import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { DashboardService } from '../../service/dashboard.service';
import { ItemColetaDado } from '../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-coleta-de-dados',
  templateUrl: './coleta-de-dados.component.html',
  styleUrls: ['./coleta-de-dados.component.scss'],
  standalone: false
})
export class ColetaDeDadosComponent implements OnInit {

  itens: ItemColetaDado[] = [];


  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getItensColetasDados().subscribe(itens => {
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
