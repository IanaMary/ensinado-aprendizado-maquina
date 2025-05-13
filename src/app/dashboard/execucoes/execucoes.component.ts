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

  dados: any[] = [];
  colunas: string[] = [];
  tipos: { [key: string]: string } = {};
  atributos: { [key: string]: boolean } = {}; // Para armazenar se a coluna é marcada como atributo
  target?: string; // Coluna escolhida como "target"
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

  abrirExecucao(item: ItemPipeline): void {
    const dialogRef = this.dialog.open(ModalColetaDadoComponent, {
      data: {
        dados: this.dados,
        colunas: this.colunas,
        tipos: this.tipos,
        atributos: this.atributos,
        target: this.target
      }
    });
  
    dialogRef.afterClosed().subscribe((resultado: {
      dados: any[],
      colunas: string[],
      tipos: { [key: string]: string },
      atributos: { [key: string]: boolean },
      target: string
    }) => {
      if (resultado?.dados?.length) {
        this.dados = resultado.dados;
        this.colunas = resultado.colunas;
        this.tipos = resultado.tipos;
        this.atributos = resultado.atributos;
        this.target = resultado.target;
      }
    });
  }

}
