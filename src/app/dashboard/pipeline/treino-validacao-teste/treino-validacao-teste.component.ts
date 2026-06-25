import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-treino-validacao-teste',
  templateUrl: './treino-validacao-teste.component.html',
  styleUrl: './treino-validacao-teste.component.scss',
  standalone: false
})
export class TreinoValidacaoTesteComponent implements OnInit {
  itens: ItemPipeline[] = [];
  classificadores: ItemPipeline[] = [];
  regressores: ItemPipeline[] = [];
  modelosNaoSupervisionado: ItemPipeline[] = [];
  // Grupos colapsáveis (abertos por padrão; auto-colapsa os totalmente desabilitados).
  gruposColapsados: Record<string, boolean> = {};

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getModelos()
      .subscribe((itens: ItemPipeline[]) => {
        this.itens = itens;

        // Supervisionado - Classificadores (preverCategoria = true, dadosRotulados = true)
        this.classificadores = itens.filter(i =>
          i.dadosRotulados === true && i.preverCategoria === true
        );

        // Supervisionado - Regressores (preverCategoria = false, dadosRotulados = true)
        this.regressores = itens.filter(i =>
          i.dadosRotulados === true && i.preverCategoria === false
        );

        // Não Supervisionado
        this.modelosNaoSupervisionado = itens.filter(i => i.dadosRotulados === false);

        // Auto-colapsa grupos cujos itens estão todos desabilitados.
        const sup = [...this.classificadores, ...this.regressores];
        this.gruposColapsados['supervisionado'] = sup.length > 0 && sup.every(i => !i.habilitado);
        this.gruposColapsados['naoSupervisionado'] =
          this.modelosNaoSupervisionado.length > 0 && this.modelosNaoSupervisionado.every(i => !i.habilitado);
      });
  }

  toggleGrupo(nome: string) {
    this.gruposColapsados[nome] = !this.gruposColapsados[nome];
  }

  isColapsado(nome: string): boolean {
    return !!this.gruposColapsados[nome];
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
