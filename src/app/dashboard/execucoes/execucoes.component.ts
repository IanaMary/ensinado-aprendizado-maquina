import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { DashboardService } from '../service/dashboard.service';
import { ItemPipeline } from '../../models/item-coleta-dado.model';
import { ModalColetaDadoComponent } from './modals/modal-coleta-dado/modal-coleta-dado.component';

interface ResultadoColetaDado {
  dados: any[];
  colunas: string[];
  tipos: { [key: string]: string };
  atributos: { [key: string]: boolean };
  target: string;
  dadosTeste: any[];
  colunasTeste: string[];
  erroTeste?: string;
  nomeArquivoTreino?: string;
  nomeArquivoTeste?: string;
}

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
  atributos: { [key: string]: boolean } = {};
  target?: string;

  dadosTeste: any[] = [];
  colunasTeste: string[] = [];

  erroTeste?: string;  // <-- aqui

  nomeArquivoTreino?: string;  // opcional
  nomeArquivoTeste?: string;   // opcional

  itens: ItemPipeline[] = [];

  constructor(
    private dashboardService: DashboardService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens];
    });
  }

  onDrop(event: CdkDragDrop<ItemPipeline[]>): void {
    // lógica futura
  }

  abrirExecucao(item: ItemPipeline): void {
    const dialogRef = this.dialog.open(ModalColetaDadoComponent, {
      data: {
        dados: this.dados,
        colunas: this.colunas,
        tipos: this.tipos,
        target: this.target,
        atributos: this.atributos,
        dadosTeste: this.dadosTeste,
        colunasTeste: this.colunasTeste,
        erroTeste: this.erroTeste,           // passa pro modal
        nomeArquivoTreino: this.nomeArquivoTreino,
        nomeArquivoTeste: this.nomeArquivoTeste,
      }
    });

    dialogRef.afterClosed().subscribe((resultado: ResultadoColetaDado | undefined) => {
      if (resultado) {
        if (resultado.dados?.length) {
          this.dados = resultado.dados;
          this.colunas = resultado.colunas;
          this.tipos = resultado.tipos;
          this.atributos = resultado.atributos;
          this.target = resultado.target;
          this.dadosTeste = resultado.dadosTeste;
          this.colunasTeste = resultado.colunasTeste;
        }

        this.erroTeste = resultado.erroTeste;               // atualiza aqui
        this.nomeArquivoTreino = resultado.nomeArquivoTreino;
        this.nomeArquivoTeste = resultado.nomeArquivoTeste;
      }
    });
  }
}
