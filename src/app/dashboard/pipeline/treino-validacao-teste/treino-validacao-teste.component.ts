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
  classificadores: ItemPipeline[] = [];
  regressores: ItemPipeline[] = [];
  modelosNaoSupervisionado: ItemPipeline[] = [];

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getModelos()
      .subscribe((itens: ItemPipeline[]) => {
        this.itens = itens;

        // Supervisionado - Classificadores (tipo = string, preverCategoria = true)
        this.classificadores = itens.filter(i =>
          i.dadosRotulados === true && i.tipo === 'string'
        );

        // Supervisionado - Regressores (tipo = number, preverCategoria = false)
        this.regressores = itens.filter(i =>
          i.dadosRotulados === true && i.tipo === 'number'
        );

        // Não Supervisionado
        this.modelosNaoSupervisionado = itens.filter(i => i.dadosRotulados === false);
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
