import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../services/dashboard.service';
import { ItemPipeline, ResultadoColetaDado } from '../../models/item-coleta-dado.model';
import { ModalExecucaoComponent } from './modals/modal-execucao/modal-execucao.component';
import { TutorContexto } from '../tutor/tutor.component';
import { Subject, takeUntil } from 'rxjs';
import tutor from '../../constants/tutor.json';


@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit {

  private destroy$ = new Subject<void>();
  private modalAberto = false;
  private tutorRef = tutor;

  tutor: any;
  tutorPipelineInfo: any = null;
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
    if (this.modalAberto) return;
    this.modalAberto = true;

    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none',
      width: 'auto',
      disableClose: true,
      hasBackdrop: false,
      data: {
        etapa: item.tipoItem === 'metrica' ? 'avaliacao' : item.tipoItem === 'treino-validacao-teste' ? 'treinamento' : item.tipoItem,
        tipoArquivoSelecionado: item.tipoItem === 'coleta-dado' ? item.valor : undefined,
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: item.tipoItem === 'treino-validacao-teste' ? item : this.modeloSelecionado,
        resultadoTreinamento: this.resultadoTreinamento,
        metricasSelecionadas: this.metricasSelecionadas,
        resultadosDasAvaliacoes: this.resultadosDasAvaliacoes
      }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      this.modalAberto = false;
      if (resultado) {
        this.resultadoColetaDado = resultado.resultadoColetaDado
        this.modeloSelecionado = resultado.modeloSelecionado
        this.resultadoTreinamento = resultado.resultadoTreinamento;
        this.metricasSelecionadas = resultado.metricasSelecionadas;
        this.resultadosDasAvaliacoes = resultado.resultadosDasAvaliacoes;
        this.dashboardService.moverItensEmExecucao();
        this.atualizarTutorContexto();
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
            this.tutor = res.descricao.replace(/&nbsp;/g, ' ');
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

  limparSessao() {
    sessionStorage.removeItem('idColeta');
    sessionStorage.removeItem('configurcaoTreinamento');
    this.resultadoColetaDado = undefined;
    this.modeloSelecionado = undefined;
    this.resultadoTreinamento = undefined;
    this.metricasSelecionadas = [];
    this.resultadosDasAvaliacoes = {};
    this.tutorPipelineInfo = null;
    this.dashboardService.limparItensExecucao();
  }

  atualizarTutorContexto(): void {
    if (this.modeloSelecionado) {
      const modelos = this.tutorRef.modelos as any;
      const modeloInfo = modelos?.[this.modeloSelecionado.valor];
      if (modeloInfo) {
        this.tutorPipelineInfo = {
          titulo: modeloInfo.nome,
          descricao: modeloInfo.descricao,
          dicas: modeloInfo.quandoUsar?.slice(0, 3) || []
        };
      }
    } else if (this.metricasSelecionadas.length > 0) {
      const metricas = this.tutorRef.metricas as any;
      const metricaInfo = metricas?.[this.metricasSelecionadas[0].valor];
      if (metricaInfo) {
        this.tutorPipelineInfo = {
          titulo: metricaInfo.nome,
          descricao: metricaInfo.descricao,
          dicas: metricaInfo.quandoUsar?.slice(0, 3) || []
        };
      }
    } else {
      this.tutorPipelineInfo = null;
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
