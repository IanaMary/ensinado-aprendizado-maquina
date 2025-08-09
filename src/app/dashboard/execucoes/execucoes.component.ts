import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../services/dashboard.service';
import { BodyTutor, ItemPipeline, ResultadoColetaDado } from '../../models/item-coleta-dado.model';
import { ModalExecucaoComponent } from './modals/modal-execucao/modal-execucao.component';
import tutor from '../../constants/tutor.json';
import { isEqual } from 'lodash';
import { Subject, takeUntil } from 'rxjs';



@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit {

  private destroy$ = new Subject<void>();


  tutor: any;
  bodyTutor: BodyTutor = {
    tamanho_arq: 0,
  };


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
    this.atualizarTutor(null);
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens];
      this.colunaColeta = itens.filter(i => i.tipoItem === 'coleta-dado');
      this.colunaTreino = itens.filter(i => i.tipoItem === 'treino-validacao-teste');
      this.colunaMetrica = itens.filter(i => i.tipoItem === 'metrica');
      this.metricasSelecionadas = this.colunaMetrica.filter(i => i.movido);
    });
    this.dashboardService.proximaEtapaPipe$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        this.atualizarTutor(event);
      });
  }


  abrirModalExecucao(item: ItemPipeline): void {
    this.atualizarTutor(item.tipoItem);
    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none',
      width: 'auto',
      disableClose: true,
      hasBackdrop: false,
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
        this.resultadosDasAvaliacoes = resultado.resultadosDasAvaliacoes;
        this.dashboardService.moverItensEmExecucao();
      }
    });
  }


  atualizarTutor(event: any) {

    if (event && event.bodyTutor) {
      const diff = !isEqual(this.bodyTutor, event.bodyTutor)
      if (diff) {

        this.bodyTutor = event.bodyTutor;

        this.getTutor();
      }
    } else {
      if (this.resultadoColetaDado?.treino) {
        this.bodyTutor.tamanho_arq = 100;
        this.bodyTutor['prever_categoria'] = this.resultadoColetaDado?.target !== null;
      }
      this.getTutor();
    }


  }

  getTutor() {
    this.dashboardService.getTutor(this.bodyTutor).subscribe({
      next: async (res: any) => {
        if (res.descricao) {
          const aux = res.descricao.replace(/&nbsp;/g, ' ');
          this.tutor = aux;
        }
      },
      error: (error: any) => { }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
