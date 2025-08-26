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
  paramsTutor = '';
  etapaAtual = '';

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
    this.getTutor('inicio');
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
        this.getTutor(event.etapaAtual, event.chaves);
      });
  }


  abrirModalExecucao(item: ItemPipeline): void {
    // this.getTutor(item.tipoItem);
    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none',
      width: 'auto',
      disableClose: true,
      hasBackdrop: false,
      data: {
        etapa: item.tipoItem === 'metrica' ? 'avaliacao' : item.tipoItem === 'treino-validacao-teste' ? 'treinamento' : item.tipoItem,
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




  getTutor(etapa: string, chaves: string[] = []) {
    const params = this.criarBody(etapa, chaves)
    if (params !== this.paramsTutor) {
      this.paramsTutor = params;
      this.etapaAtual = this.etapaAtual;
      this.dashboardService.getTutor(this.paramsTutor).subscribe({
        next: async (res: any) => {
          if (res.descricao) {
            this.tutor = res.descricao;
          }
        },
        error: (error: any) => { }
      });
    }
  }

  criarBody(etapa: string, chaves: string[]) {

    const params = new URLSearchParams();
    params.append('pipe', etapa);

    chaves?.forEach(chave => params.append('textos', chave));

    return params.toString();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
