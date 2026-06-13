import { Component } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';

interface GrupoMetricas {
  nome: string;
  icone: string;
  itens: ItemPipeline[];
}

@Component({
  selector: 'app-metricas',
  templateUrl: './metricas.component.html',
  styleUrl: './metricas.component.scss',
  standalone: false
})
export class MetricasComponent {
  grupos: GrupoMetricas[] = [];

  private nomesGrupos: Record<string, { nome: string; icone: string }> = {
    classificacao: { nome: 'Classificação', icone: 'category' },
    regressao: { nome: 'Regressão', icone: 'trending_up' },
    agrupamento: { nome: 'Agrupamento', icone: 'scatter_plot' },
  };

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.dashboardService.getItensMetricas().subscribe(itens => {
      const mapa = new Map<string, ItemPipeline[]>();
      for (const item of itens) {
        const grupo = (item as any).grupo || 'outros';
        if (!mapa.has(grupo)) {
          mapa.set(grupo, []);
        }
        mapa.get(grupo)!.push(item);
      }

      const ordem = ['classificacao', 'regressao', 'agrupamento', 'outros'];
      this.grupos = [];
      for (const key of ordem) {
        if (mapa.has(key)) {
          const meta = this.nomesGrupos[key] || { nome: key, icone: 'help' };
          this.grupos.push({ nome: meta.nome, icone: meta.icone, itens: mapa.get(key)! });
        }
      }
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
