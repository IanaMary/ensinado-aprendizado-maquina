import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface NomearPipelineDialogData {
  nomeAtual?: string;
  isEdicao?: boolean;
}

@Component({
  selector: 'app-nomear-pipeline-dialog',
  templateUrl: './nomear-pipeline-dialog.component.html',
  styleUrls: ['./nomear-pipeline-dialog.component.scss'],
  standalone: false,
})
export class NomearPipelineDialogComponent {

  nome: string = '';
  erro: string = '';

  constructor(
    private dialogRef: MatDialogRef<NomearPipelineDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) public data: NomearPipelineDialogData,
  ) {
    this.nome = data?.nomeAtual?.trim() || '';
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  confirmar(): void {
    const nomeTrim = this.nome.trim();
    if (!nomeTrim) {
      this.erro = 'Informe um nome para o pipeline.';
      return;
    }
    if (nomeTrim.length > 100) {
      this.erro = 'O nome deve ter no máximo 100 caracteres.';
      return;
    }
    this.dialogRef.close(nomeTrim);
  }
}
