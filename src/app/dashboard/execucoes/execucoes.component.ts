import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DashboardService } from '../service/dashboard.service';
import { ItemPipeline } from '../../models/item-coleta-dado.model';
import { ModalColetaDadoComponent } from './modals/modal-coleta-dado/modal-coleta-dado.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit {

  dadosExcel: any[] = [];
  itens: ItemPipeline[] = [];

  constructor(private dashboardService: DashboardService,
    public dialog: MatDialog,
  ) { }

  ngOnInit() {
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens]; 
    });
  }

  onDrop(event: CdkDragDrop<any[]>) {}

  abrirExecucao(item : ItemPipeline) {
    const dialogRef = this.dialog.open(ModalColetaDadoComponent, {
      data: { dados: this.dadosExcel }
    });

    dialogRef.afterClosed().subscribe((resultado: any[]) => {
      if (resultado?.length) {
        this.dadosExcel = resultado;
      }
    });
  }

}
