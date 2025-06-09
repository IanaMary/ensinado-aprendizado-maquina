import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../services/dashboard.service';
import { ItemPipeline, ResultadoColetaDado } from '../../models/item-coleta-dado.model';
import { ModalExecucaoComponent } from './modals/modal-execucao/modal-execucao.component';

@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit {

  itens: ItemPipeline[] = [];

  resultadoColetaDado?: ResultadoColetaDado;
  modeloSelecionado?: ItemPipeline;


  constructor(
    private dashboardService: DashboardService,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens];
    });
  }

  onDrop(event: CdkDragDrop<ItemPipeline[]>): void {
    // lógica futura
  }


  abrirModalExecucao(tipoItem: ItemPipeline): void {
    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      data: {
        etapa: tipoItem.tipoItem,
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: this.modeloSelecionado
      }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      this.resultadoColetaDado = resultado.resultadoColetaDado
      this.modeloSelecionado = resultado.modeloSelecionado
      this.dashboardService.moverItensEmExecucao();

    });
  }


  abrirPreProcessamento(item: ItemPipeline): void {}

  abrirClassificador(item: ItemPipeline): void { }

  classificadorPrever() { }

}
