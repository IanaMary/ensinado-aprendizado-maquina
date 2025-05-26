import { Component, Inject, OnInit } from '@angular/core';
import { Modelo, ResultadoColetaDado, TipoTarget } from '../../../../models/item-coleta-dado.model';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

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
  modeloSelecionado?: Modelo;

  tipoTargetSelecionado: TipoTarget = undefined;

  titulos = ['Importar Planilha', 'Selecionar Classificador', 'Treino Teste'];

  constructor(
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
    let attVazio = Object.keys(att).length === 0 || Object.values(att).every(v => v === false);
    this.proximaEtapaDesaabilitada = this.tipoTargetSelecionado === undefined || attVazio;
  }

  atualizarModelo(event: Modelo) {
    this.modeloSelecionado = event;
    this.proximaEtapaDesaabilitada = false
  }

  fechar(): void {
    this.dialogRef.close({ resultadoColetaDado: this.resultadoColetaDado, modeloSelecionado: this.modeloSelecionado });
  }
}
