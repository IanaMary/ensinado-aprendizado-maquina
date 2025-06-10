import { Component, Inject, OnInit } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado, TipoTarget } from '../../../../models/item-coleta-dado.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DashboardService } from '../../../services/dashboard.service';
import itensPipeline from '../../../../constants/itens-coletas-dados.json'

@Component({
  selector: 'modal-execucao',
  templateUrl: './modal-execucao.component.html',
  styleUrls: ['./modal-execucao.component.scss'],
  standalone: false
})
export class ModalExecucaoComponent implements OnInit {
  etapaAtual: number = 0;
  nEtapas: number = 0;

  etapas: { [key: string]: number } = {
    'coleta-dado': 0,
    'selecao-do-modelo': 1,
    'treino-validacao-teste': 2,
    'selecao-das-metricas': 3,
    'metrica': 4
  };

  titulos: string[] = [
    'Importar Planilha',
    'Seleção do Modelo',
    'Treinamento',
    'Seleção das Métricas',
    'Visualizar Avaliações'
  ];

  proximaEtapaDesaabilitada = true;

  resultadoColetaDado?: ResultadoColetaDado | undefined;
  resultadoTreinamento?: any;
  modeloSelecionado?: ItemPipeline;

  tipoTargetSelecionado: TipoTarget = undefined;

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

  ngOnInit(): void {
    this.nEtapas = this.titulos.length
  }

  proximo(): void {
    if (this.etapaAtual < this.nEtapas - 1) {
      this.etapaAtual++;
    }
    switch (this.etapaAtual) {
      case 0:
        this.proximaEtapaDesaabilitada = !this.resultadoColetaDado;
        break;
      case 1:
        this.tipoTargetSelecionado = this.resultadoColetaDado?.treino.tipoTarget ?? undefined;
        this.proximaEtapaDesaabilitada = !this.modeloSelecionado;
        break;
      case 2:
        this.proximaEtapaDesaabilitada = !this.resultadoTreinamento || this.metricasDisponiveis.length === 0;
        break;
      case 3:
        this.proximaEtapaDesaabilitada = this.metricasSelecionadas.length === 0;
        break;
      case 4:
        this.proximaEtapaDesaabilitada = false;
        break;
      default:
        this.proximaEtapaDesaabilitada = true;
    }
  }

  anterior(): void {
    if (this.etapaAtual > 0) {
      this.etapaAtual--;
    }
    this.proximaEtapaDesaabilitada = false;
  }

  atualizarResultado(event: ResultadoColetaDado) {
    this.resultadoColetaDado = event;
    this.tipoTargetSelecionado = event.treino.tipoTarget;

    const att = event.treino.atributos;
    const attVazio = Object.keys(att).length === 0 || Object.values(att).every(v => v === false);

    const erroTreino = !!event.treino.erro;
    const erroTeste = !!event.teste?.erro;
    const tipoTargetNaoSelecionado = this.tipoTargetSelecionado === undefined;

    this.proximaEtapaDesaabilitada = erroTreino || erroTeste || tipoTargetNaoSelecionado || attVazio;

    this.dashboardService.habilitadarModelos(
      this.tipoTargetSelecionado,
      !this.proximaEtapaDesaabilitada
    );
  }

  atualizarModelo(event: ItemPipeline) {
    this.modeloSelecionado = event;
    this.dashboardService.selecionarModelo(this.modeloSelecionado);
    this.proximaEtapaDesaabilitada = false
  }

  atualizarResultadoTreinamento(event: any) {
    this.resultadoTreinamento = event;
    this.inicializarMetricasDisponiveis();
    this.proximaEtapaDesaabilitada = this.metricasDisponiveis.length === 0
  }

  inicializarMetricasDisponiveis() {
    const metricasModelo = this.modeloSelecionado?.metricas ?? [];

    this.metricasDisponiveis = this.todasMetricas.filter(metrica =>
      metricasModelo.includes(metrica.valor)
    );

    this.dashboardService.habilitadarMetricas(this.metricasDisponiveis);
  }

  atualizarMetricasSelecionadas(event: any) {
    this.proximaEtapaDesaabilitada = this.metricasSelecionadas.length == 0;
  }


  atualizarVariaveis(data: any) {
    this.etapaAtual = this.etapas[data?.etapa] ?? 0;


    if (data?.resultadoColetaDado) {

      const { resultadoColetaDado } = data;
      this.resultadoColetaDado = resultadoColetaDado;
      this.tipoTargetSelecionado = resultadoColetaDado.tipoTarget ?? undefined;
    }


    if (data?.modeloSelecionado) {
      this.modeloSelecionado = data.modeloSelecionado;
    }


    if (data?.resultadoTreinamento) {
      this.resultadoTreinamento = data.resultadoTreinamento;
    }


    if (data?.metricasSelecionadas) {
      this.metricasSelecionadas = data.metricasSelecionadas;
      this.inicializarMetricasDisponiveis();
    }

    if (data?.resultadosDasAvaliacoes) {
      this.resultadosDasAvaliacoes = data.resultadosDasAvaliacoes;
    }

    const temDados = data?.resultadoColetaDado || data?.modeloSelecionado || data?.resultadoTreinamento || data.metricasSelecionadas;
    this.proximaEtapaDesaabilitada = !temDados;

  }

  atualizarResultadoAvaliacoes(event: any) {
    this.resultadosDasAvaliacoes = event;
  }

  fechar(): void {
    this.dialogRef.close({
      resultadoColetaDado: this.resultadoColetaDado,
      modeloSelecionado: this.modeloSelecionado,
      resultadoTreinamento: this.resultadoTreinamento,
      metricasSelecionadas: this.metricasSelecionadas,
      resultadosDasAvaliacoes: this.resultadosDasAvaliacoes,
    });
  }

  getClasseLinhaPipe(idx: number): string {
    if (idx < this.etapaAtual) return 'visitada';
    if (idx === this.etapaAtual) return 'atual';
    return 'desabilitada';
  }
}
