import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DashboardService } from '../service/dashboard.service';
import { ItemColetaDado } from '../../models/item-coleta-dado.model';

@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit {

  itens: ItemColetaDado[] = [];

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens]; 
    });
  }

  onDrop(event: CdkDragDrop<any[]>) {}

}
