import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
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
  colunaColeta: ItemPipeline[] = [];
  colunaTreino: ItemPipeline[] = [];
  colunaMetrica: ItemPipeline[] = [];

  resultadoColetaDado?: ResultadoColetaDado;
  modeloSelecionado?: ItemPipeline;
  resultadoTreinamento?: any;
  metricasSelecionadas: ItemPipeline[] = [];
  resultadosDasAvaliacoes: any = {};

  constructor(
    private dashboardService: DashboardService,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens];
      this.colunaColeta = itens.filter(i => i.tipoItem === 'coleta-dado');
      this.colunaTreino = itens.filter(i => i.tipoItem === 'treino-validacao-teste');
      this.colunaMetrica = itens.filter(i => i.tipoItem === 'metrica');
      this.metricasSelecionadas = this.colunaMetrica.filter(i => i.movido);
    });
  }


  abrirModalExecucao(item: ItemPipeline): void {
    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      data: {
        etapa: item.tipoItem,
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: item.tipoItem === 'treino-validacao-teste' ? item : this.modeloSelecionado,
        resultadoTreinamento: this.resultadoTreinamento,
        metricasSelecionadas: this.metricasSelecionadas,
        resultadosDasAvaliacoes: this.resultadosDasAvaliacoes
      }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      if (resultado) {
        this.resultadoColetaDado = resultado.resultadoColetaDado
        this.modeloSelecionado = resultado.modeloSelecionado
        this.resultadoTreinamento = resultado.resultadoTreinamento;
        this.metricasSelecionadas = resultado.metricasSelecionadas;
        this.resultadosDasAvaliacoes = resultado.resultadosDasAvaliacoes
        this.dashboardService.moverItensEmExecucao();
      }
    });
  }


}
