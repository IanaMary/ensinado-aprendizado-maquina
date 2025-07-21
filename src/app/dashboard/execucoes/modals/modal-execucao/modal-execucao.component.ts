import { Component, Inject, OnInit } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado, TipoTarget } from '../../../../models/item-coleta-dado.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DashboardService } from '../../../services/dashboard.service';
import itensPipeline from '../../../../constants/itens-coletas-dados.json';
import tutor from '../../../../constants/tutor.json';

@Component({
  selector: 'modal-execucao',
  templateUrl: './modal-execucao.component.html',
  styleUrls: ['./modal-execucao.component.scss'],
  standalone: false
})
export class ModalExecucaoComponent implements OnInit {

  tutor = tutor;

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

  tipoTargetSelecionado: TipoTarget = null;
  tutorModeloTarget: string[] = [];

  todasMetricas = itensPipeline.itensMetricas as ItemPipeline[];
  metricasDisponiveis: ItemPipeline[] = [];
  metricasSelecionadas: ItemPipeline[] = [];
  resultadosDasAvaliacoes: any;

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
        break;
      case 'selecao-do-modelo':
        this.tipoTargetSelecionado = this.resultadoColetaDado?.treino?.tipoTarget ?? null;
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
    this.tipoTargetSelecionado = event.treino.tipoTarget
    this.tutorModeloTarget = this.tipoTargetSelecionado === 'string' ? tutor.resumos['modelo-classificacao'] :
      this.tipoTargetSelecionado === 'number' ? tutor.resumos['modelo-regressao'] :
        tutor.resumos['modelo-exploratorio'];

    const att = event.treino.atributos;
    const attVazio = Object.keys(att).length === 0 || Object.values(att).every(v => v === false);

    const erroTreino = !!event.treino.erro;
    const erroTeste = !!event.teste?.erro;
    const tipoTargetNaoSelecionado = this.tipoTargetSelecionado === undefined;

    this.etapas[this.etapaAtual].proximo = !(erroTreino || erroTeste || tipoTargetNaoSelecionado || attVazio);

    this.dashboardService.habilitadarModelos(
      this.tipoTargetSelecionado,
      this.etapas[this.etapaAtual].proximo
    );

    this.modelosDisponiveis = this.dashboardService.getModelosPorTipo(this.tipoTargetSelecionado);
    this.modeloSelecionado = this.modelosDisponiveis[0];
  }

  atualizarModelo(event: ItemPipeline) {
    this.modeloSelecionado = event;
    this.etapas[this.etapaAtual].proximo = true;
  }

  atualizarResultadoTreinamento(event: any) {
    this.resultadoTreinamento = event;
    this.dashboardService.selecionarModelo(this.modeloSelecionado);
    this.inicializarMetricasDisponiveis();
    this.etapas[this.etapaAtual].proximo = this.metricasDisponiveis.length > 0;
  }

  inicializarMetricasDisponiveis() {
    const metricasModelo = this.modeloSelecionado?.metricas ?? [];

    this.metricasDisponiveis = this.todasMetricas.filter(metrica =>
      metricasModelo.includes(metrica.valor)
    );

    this.dashboardService.habilitadarMetricas(this.metricasDisponiveis);
  }

  atualizarMetricasSelecionadas(event: any) {
    this.etapas[this.etapaAtual].proximo = this.metricasSelecionadas.length > 0;
  }

  atualizarVariaveis(data: any) {
    if (data?.etapa) {
      this.etapaAtual = data.etapa;
    }

    this.etapas['coleta-dado'].proximo = !!data?.resultadoColetaDado;
    this.etapas['selecao-do-modelo'].proximo = !!data?.modeloSelecionado;
    this.etapas['treino-validacao-teste'].proximo = !!data?.resultadoTreinamento;
    this.etapas['selecao-das-metricas'].proximo = !!data?.metricasSelecionadas;
    this.etapas['metrica'].proximo = !!data?.resultadosDasAvaliacoes;

    if (this.etapas['coleta-dado'].proximo) {
      this.resultadoColetaDado = data.resultadoColetaDado;
      this.tipoTargetSelecionado = data.resultadoColetaDado?.treino?.tipoTarget ?? undefined;
      this.modelosDisponiveis = this.dashboardService.getModelosPorTipo(this.tipoTargetSelecionado);
      this.modeloSelecionado = data.modeloSelecionado ? data.modeloSelecionado : this.modelosDisponiveis[0];
    }

    if (this.etapas['selecao-do-modelo'].proximo) {
      this.modeloSelecionado = data.modeloSelecionado;
    }

    if (this.etapas['treino-validacao-teste'].proximo) {
      this.resultadoTreinamento = data.resultadoTreinamento;
    }

    if (this.etapas['selecao-das-metricas'].proximo) {
      this.metricasSelecionadas = data.metricasSelecionadas;
      this.inicializarMetricasDisponiveis();
    }

    if (this.etapas['metrica'].proximo) {
      this.resultadosDasAvaliacoes = data.resultadosDasAvaliacoes;
    }
  }

  atualizarResultadoAvaliacoes(event: any) {
    this.resultadosDasAvaliacoes = event;
  }

  selecaoTarget() { }

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
}
