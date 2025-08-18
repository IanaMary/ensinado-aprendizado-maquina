import { Component, Inject, OnInit } from '@angular/core';
import { BodyTutor, ItemPipeline, ResultadoColetaDado, labelParaTipoTargetMap } from '../../../../models/item-coleta-dado.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DashboardService } from '../../../services/dashboard.service';
import tutor from '../../../../constants/tutor.json';

@Component({
  selector: 'modal-execucao',
  templateUrl: './modal-execucao.component.html',
  styleUrls: ['./modal-execucao.component.scss'],
  standalone: false
})
export class ModalExecucaoComponent implements OnInit {

  tutor = tutor;

  bodyTutor: BodyTutor = {
    tamanho_arq: 0,
  }

  etapas: Record<string, { indice: number; proximo: boolean; titulo: string; botaoProximo?: string }> = {
    'coleta-dado': { indice: 0, proximo: true, titulo: 'Importar Planilha' },
    'selecao-do-modelo': { indice: 1, proximo: true, titulo: 'Seleção do Modelo', botaoProximo: 'Treinar' },
    'treino-validacao-teste': { indice: 2, proximo: true, titulo: 'Treinamento' },
    'selecao-das-metricas': { indice: 3, proximo: true, titulo: 'Seleção das Métricas' },
    'metrica': { indice: 4, proximo: true, titulo: 'Visualizar Avaliações' }
  };

  etapaKeys = Object.keys(this.etapas);
  nEtapas = this.etapaKeys.length;

  ordemEtapas = Object.keys(this.etapas);
  etapaAtual: string = 'coleta-dado';

  resultadoColetaDado?: ResultadoColetaDado | undefined;
  resultadoTreinamento?: any;
  modeloSelecionado?: ItemPipeline;
  modelosDisponiveis: ItemPipeline[] = [];

  tutorModeloTarget: string[] = [];

  metricasDisponiveis: ItemPipeline[] = [];
  metricasSelecionadas: ItemPipeline[] = [];
  resultadosDasAvaliacoes: any = {};

  constructor(
    private dashboardService: DashboardService,
    public dialogRef: MatDialogRef<ModalExecucaoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.atualizarVariaveis(data);
  }

  ngOnInit(): void { }

  proximo(): void {
    const indiceAtual = this.etapas[this.etapaAtual].indice;

    if (indiceAtual < this.ordemEtapas.length - 1) {
      this.etapaAtual = this.ordemEtapas[indiceAtual + 1];
    }

    this.validarProximaEtapa();
  }

  anterior(): void {
    const indiceAtual = this.etapas[this.etapaAtual].indice;

    if (indiceAtual > 0) {
      this.etapaAtual = this.ordemEtapas[indiceAtual - 1];
    }

    this.validarProximaEtapa();
  }

  validarProximaEtapa(): void {
    switch (this.etapaAtual) {
      case 'coleta-dado':
        this.etapas[this.etapaAtual].proximo = !!this.resultadoColetaDado;
        this.emitTutor();
        break;
      case 'selecao-do-modelo':
        this.etapas[this.etapaAtual].proximo = !!this.modeloSelecionado;
        break;
      case 'treino-validacao-teste':
        this.etapas[this.etapaAtual].proximo = !!this.resultadoTreinamento && this.metricasDisponiveis.length > 0;
        break;
      case 'selecao-das-metricas':
        this.etapas[this.etapaAtual].proximo = this.metricasSelecionadas.length > 0;
        break;
      case 'metrica':
        this.etapas[this.etapaAtual].proximo = true;
        break;
      default:
        this.etapas[this.etapaAtual].proximo = false;
    }
  }

  atualizarResultadoColeta(event: ResultadoColetaDado) {

    this.resultadoColetaDado = event;

    const aux = this.resultadoColetaDado?.tipoTarget;

    const tipoTarget = aux ? labelParaTipoTargetMap[aux] : null;

    this.tutorModeloTarget = tipoTarget === 'Texto' ? tutor.resumos['modelo-classificacao'] :
      tipoTarget === 'Número' ? tutor.resumos['modelo-regressao'] :
        tutor.resumos['modelo-exploratorio'];

    const att = event.atributos;

    const attSelecionado = Object.values(att).includes(true);


    const erroTreino = !!this.resultadoColetaDado.treino.erro;
    const erroTeste = !!this.resultadoColetaDado.teste?.erro;
    const tipoTargetNaoSelecionado = tipoTarget === undefined;

    this.etapas[this.etapaAtual].proximo = !(erroTreino || erroTeste || tipoTargetNaoSelecionado || !attSelecionado);

    this.dashboardService.habilitadarModelos(
      tipoTarget,
      this.etapas[this.etapaAtual].proximo
    );

    this.modelosDisponiveis = this.dashboardService.getModelosPorTipo(tipoTarget);
    this.modeloSelecionado = this.modelosDisponiveis[0];
    this.emitTutor();
  }


  atualizarModelo(event: ItemPipeline) {
    this.modeloSelecionado = event;
    this.etapas[this.etapaAtual].proximo = true;
  }

  async atualizarResultadoTreinamento(event: any) {

    this.resultadoTreinamento = event;
    this.dashboardService.selecionarModelo(this.modeloSelecionado);
    this.inicializarMetricasDisponiveis();
  }

  inicializarMetricasDisponiveis() {

    if (this.resultadoTreinamento) {
      const modelosTreinados = Object.keys(this.resultadoTreinamento);
      this.metricasDisponiveis = this.dashboardService.habilitadarMetricas(modelosTreinados);
      this.etapas[this.etapaAtual].proximo = this.metricasDisponiveis.length > 0
    }

  }

  atualizarMetricasSelecionadas(event: any) {
    this.metricasSelecionadas = event;
    this.etapas['selecao-das-metricas'].proximo = this.metricasSelecionadas.length > 0;
  }

  funcResultadoAvaliacoes(event: any) {
    this.resultadosDasAvaliacoes = event;
  }

  atualizarVariaveis(data: any) {
    if (data?.etapa) {
      this.etapaAtual = data.etapa;
      if (!this.resultadoColetaDado && data.resultadoColetaDado) {
        this.atualizarResultadoColeta(data.resultadoColetaDado);
      }
      if (data.modeloSelecionado) {
        this.atualizarModelo(data.modeloSelecionado);
      }
      if (data.resultadoTreinamento) {
        this.atualizarResultadoTreinamento(data.resultadoTreinamento);
      }
      if (data.metricasSelecionadas) {
        this.atualizarMetricasSelecionadas(data.metricasSelecionadas);
      }
      if (data.resultadosDasAvaliacoes) {
        this.funcResultadoAvaliacoes(data.resultadosDasAvaliacoes)
      }
    }
  }

  fechar(): void {
    this.dialogRef.close({
      resultadoColetaDado: this.resultadoColetaDado,
      modeloSelecionado: this.modeloSelecionado,
      resultadoTreinamento: this.resultadoTreinamento,
      metricasSelecionadas: this.metricasSelecionadas,
      resultadosDasAvaliacoes: this.resultadosDasAvaliacoes,
      etapa: this.etapaAtual
    });
  }

  getClasseLinhaPipe(idx: number): string {
    const indiceAtual = this.etapas[this.etapaAtual].indice;

    if (idx < indiceAtual) return 'visitada';
    if (idx === indiceAtual) return 'atual';
    return 'desabilitada';
  }

  drawerOpen = false;

  toggleDrawer() {
    this.drawerOpen = !this.drawerOpen;
  }

  get explicacaoAtual(): any[] {
    const idx = this.etapas[this.etapaAtual].indice;
    if (idx === 0) return this.tutor.resumos.xlsx;
    if (idx === 1) return this.tutorModeloTarget;
    return [];
  }

  emitTutor() {
    console.log('emitTutor => ', this.resultadoColetaDado)
    this.bodyTutor.tamanho_arq = 100
    this.bodyTutor['prever_categoria'] = this.resultadoColetaDado?.tipoTarget === 'Texto'
    // this.bodyTutor.prever_quantidade = this.resultadoColetaDado?.tipoTarget === 'Número'
    // this.bodyTutor.dados_rotulados = this.resultadoColetaDado?.target !== null
    this.dashboardService.emitirProximaEtapaPipe({ etapaAtual: this.etapaAtual, bodyTutor: this.bodyTutor });
  }
}
