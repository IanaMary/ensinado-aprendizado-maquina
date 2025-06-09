import { Component, Inject, OnInit } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado, TipoTarget } from '../../../../models/item-coleta-dado.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'modal-execucao',
  templateUrl: './modal-execucao.component.html',
  styleUrls: ['./modal-execucao.component.scss'],
  standalone: false
})
export class ModalExecucaoComponent implements OnInit {
  etapaAtual = 0;
  nEtapas = 0

  proximaEtapaDesaabilitada = true;

  resultadoColetaDado?: ResultadoColetaDado | undefined;
  modeloSelecionado?: ItemPipeline;

  tipoTargetSelecionado: TipoTarget = undefined;

  titulos = ['Importar Planilha', 'Selecionar Classificador', 'Treino Teste'];

  constructor(
    private dashboardService: DashboardService,
    public dialogRef: MatDialogRef<ModalExecucaoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {

    if (data?.resultadoColetaDado) {
      this.resultadoColetaDado = data.resultadoColetaDado;
      this.tipoTargetSelecionado = data.resultadoColetaDado?.tipoTarget ?? undefined;
      this.proximaEtapaDesaabilitada = false;
    }
    if (data?.modeloSelecionado) {
      this.modeloSelecionado = data.modeloSelecionado;
      this.proximaEtapaDesaabilitada = false;
    }
  }

  ngOnInit(): void {
    this.nEtapas = this.titulos.length
  }

  proximo(): void {
    if (this.etapaAtual < this.nEtapas) {
      this.etapaAtual++;
    }
    if (this.etapaAtual > 1) {
      if (this.modeloSelecionado) {
        this.dashboardService.atualizarModeloSelecionado(this.modeloSelecionado.valor, this.modeloSelecionado.tipo);
      }
    }
    this.proximaEtapaDesaabilitada = true;
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

    this.dashboardService.atualizarItensTreinoPorTipo(
      this.tipoTargetSelecionado,
      !this.proximaEtapaDesaabilitada
    );
  }

  atualizarModelo(event: ItemPipeline) {
    this.modeloSelecionado = event;
    this.proximaEtapaDesaabilitada = false
  }

  fechar(): void {
    this.dialogRef.close({ resultadoColetaDado: this.resultadoColetaDado, modeloSelecionado: this.modeloSelecionado });
  }

  getClasseLinhaPipe(idx: number): string {
    if (idx < this.etapaAtual) return 'visitada';
    if (idx === this.etapaAtual) return 'atual';
    return 'desabilitada';
  }
}
