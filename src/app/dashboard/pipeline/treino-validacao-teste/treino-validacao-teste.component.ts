import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-treino-validacao-teste',
  templateUrl: './treino-validacao-teste.component.html',
  styleUrl: './treino-validacao-teste.component.scss',
  standalone: false
})
export class TreinoValidacaoTesteComponent {
  itens: ItemPipeline[] = [];


  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getModelos()
      .subscribe((itens: ItemPipeline[]) => {
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
