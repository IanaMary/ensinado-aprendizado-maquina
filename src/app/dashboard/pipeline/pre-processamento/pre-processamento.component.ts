import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';
import { PreProcessamentoDialogComponent } from './pre-processamento-dialog/pre-processamento-dialog.component';

@Component({
  selector: 'app-pre-processamento',
  templateUrl: './pre-processamento.component.html',
  styleUrl: './pre-processamento.component.scss',
  standalone: false
})
export class PreProcessamentoComponent implements OnInit {
  itens: ItemPipeline[] = [];
  grupos: { nome: string; label: string; icon: string; itens: ItemPipeline[] }[] = [];
  // Sub-grupos colapsáveis (abertos por padrão; auto-colapsa os totalmente desabilitados).
  gruposColapsados: Record<string, boolean> = {};

  private grupoConfig: Record<string, { label: string; icon: string }> = {
    'scalers': { label: 'Scalers', icon: 'scale' },
    'encoders': { label: 'Encoders', icon: 'code' },
    'imputers': { label: 'Imputers', icon: 'build' },
    'transformers': { label: 'Transformers', icon: 'auto_fix_high' }
  };

  constructor(
    private dashboardService: DashboardService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.dashboardService.getItensPreProcessamento().subscribe(itens => {
      this.itens = itens as any;
      this.agruparItens();
    });
  }

  agruparItens() {
    const gruposMap = new Map<string, ItemPipeline[]>();

    for (const item of this.itens) {
      const grupo = (item as any).grupo || 'outros';
      if (!gruposMap.has(grupo)) {
        gruposMap.set(grupo, []);
      }
      gruposMap.get(grupo)!.push(item);
    }

    this.grupos = Array.from(gruposMap.entries()).map(([key, itens]) => ({
      nome: key,
      label: this.grupoConfig[key]?.label || key,
      icon: this.grupoConfig[key]?.icon || 'settings',
      itens
    }));

    // Colapsa de início os grupos cujos itens estão todos desabilitados.
    for (const g of this.grupos) {
      this.gruposColapsados[g.nome] = g.itens.length > 0 && g.itens.every(i => !i.habilitado);
    }
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

  onItemClicked(item: ItemPipeline, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    // Abrir dialog de configuração
    const dialogRef = this.dialog.open(PreProcessamentoDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      if (resultado) {
        // Marcar item como movido e adicionar ao pipeline
        item.movido = true;
        this.dashboardService.movendoItemExecucao(item);
      }
    });
  }

  onInfoClick(item: ItemPipeline, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.dashboardService.emitInfoItemClicked(item);
  }
}
