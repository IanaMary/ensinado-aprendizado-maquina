import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../../services/dashboard.service';
import { ItemPipeline } from '../../../models/item-coleta-dado.model';
import { ToyDatasetsDialogComponent } from './toy-datasets-dialog/toy-datasets-dialog.component';

@Component({
  selector: 'app-coleta-de-dados',
  templateUrl: './coleta-de-dados.component.html',
  styleUrls: ['./coleta-de-dados.component.scss'],
  standalone: false
})
export class ColetaDeDadosComponent implements OnInit {

  itens: ItemPipeline[] = [];
  toyDatasets: ItemPipeline[] = [];

  constructor(
    private dashboardService: DashboardService,
    private dialog: MatDialog
  ) { }

  ngOnInit() {
    this.dashboardService.getItensColetasDados()
      .subscribe((itens: ItemPipeline[]) => {
        this.itens = itens;
      });

    // Carregar toy datasets como itens do pipeline
    this.carregarToyDatasets();
  }

  carregarToyDatasets() {
    this.dashboardService.getToyDatasets().subscribe({
      next: (datasets: any[]) => {
        this.toyDatasets = datasets.map(ds => ({
          label: ds.nome,
          movido: false,
          tipoItem: 'coleta-dado' as const,
          habilitado: true,
          valor: ds.id,
          resumo: ds.descricao,
          preverCategoria: ds.tipo === 'classificacao',
          dadosRotulados: true,
          isDataset: true,
          datasetInfo: ds
        }) as any);
      },
      error: (err: any) => {
        console.error('Erro ao carregar toy datasets:', err);
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

  abrirDialogDatasets(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    const dialogRef = this.dialog.open(ToyDatasetsDialogComponent, {
      width: '750px',
      maxWidth: '90vw',
      panelClass: 'toy-datasets-dialog'
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      if (resultado) {
        this.dashboardService.emitirResultadoDataset(resultado);
      }
    });
  }
}
