import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PlanilhaService } from '../../../../service/planilha.service';

@Component({
  selector: 'app-modal-coleta-dado',
  templateUrl: './modal-coleta-dado.component.html',
  styleUrls: ['./modal-coleta-dado.component.scss'],
  standalone: false
})
export class ModalColetaDadoComponent {
  dados: any[] = [];
  colunas: string[] = [];
  erro?: string;

  constructor(
    public dialogRef: MatDialogRef<ModalColetaDadoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { dados?: any[] },
    private planilhaService: PlanilhaService
  ) {
    if (data?.dados?.length) {
      console.log("ee ,=", data)
      this.dados = data.dados;
      this.colunas = this.obterColunas(data.dados);
    }
  }

  onArquivoSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    this.dados = [];
    this.colunas = [];
    this.erro = undefined;

    if (!arquivo) {
      this.erro = 'Nenhum arquivo selecionado.';
      return;
    }

    const extensao = arquivo.name.split('.').pop()?.toLowerCase();
    if (extensao !== 'xlsx') {
      this.erro = 'Formato inválido. Apenas arquivos .xlsx são aceitos.';
      return;
    }

    this.planilhaService.lerPlanilha(arquivo, true).then((dados) => {
      if (dados.length === 0) {
        this.erro = 'A planilha está vazia ou malformada.';
      } else {
        this.dados = dados;
        this.colunas = this.obterColunas(dados);
      }
    }).catch((e) => {
      this.erro = 'Erro ao processar o arquivo. Verifique se é uma planilha válida.';
      console.error(e);
    });
  }

  obterColunas(dados: any[]): string[] {
    return dados.length > 0 ? Object.keys(dados[0]) : [];
  }

  fecharModal(): void {
    this.dialogRef.close(this.dados);
  }
}
