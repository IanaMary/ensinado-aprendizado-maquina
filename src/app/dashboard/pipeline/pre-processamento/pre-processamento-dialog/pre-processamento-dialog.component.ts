import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-pre-processamento-dialog',
  templateUrl: './pre-processamento-dialog.component.html',
  styleUrls: ['./pre-processamento-dialog.component.scss'],
  standalone: false
})
export class PreProcessamentoDialogComponent {
  item: any;
  colunas: string[] = [];
  colunasSelecionadas: string[] = [];

  constructor(
    private dialogRef: MatDialogRef<PreProcessamentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.item = data.item;
    // Simular colunas disponíveis (em produção, viria do dataset carregado)
    this.colunas = ['feature1', 'feature2', 'feature3', 'feature4', 'target'];
  }

  toggleColuna(coluna: string) {
    const idx = this.colunasSelecionadas.indexOf(coluna);
    if (idx >= 0) {
      this.colunasSelecionadas.splice(idx, 1);
    } else {
      this.colunasSelecionadas.push(coluna);
    }
  }

  isColunaSelecionada(coluna: string): boolean {
    return this.colunasSelecionadas.includes(coluna);
  }

  selecionarTodas() {
    this.colunasSelecionadas = [...this.colunas];
  }

  limparSelecao() {
    this.colunasSelecionadas = [];
  }

  confirmar() {
    this.dialogRef.close({
      item: this.item,
      colunas: this.colunasSelecionadas
    });
  }

  fechar() {
    this.dialogRef.close();
  }
}
