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
  tipos: { [key: string]: string } = {};
  atributos: { [key: string]: boolean } = {}; // Para armazenar se a coluna é marcada como atributo
  target: string = ''; // Coluna escolhida como "target"
  erro?: string;

  constructor(
    public dialogRef: MatDialogRef<ModalColetaDadoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private planilhaService: PlanilhaService
  ) {

    if (data) {
      if (data.dados?.length) {
        this.dados = data.dados;
      }
  
      if (data.colunas?.length) {
        this.colunas = data.colunas;
      } else {
        this.colunas = this.obterColunas(this.dados);
      }
  
      if (data.tipos) {
        this.tipos = data.tipos;
      } else {
        this.tipos = this.detectarTipos(this.dados);
      }

      if (data.target) {
        this.target = data.target;
      }
      if (data.atributos) {
        this.atributos = data.atributos;
      }
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
        this.tipos = this.detectarTipos(dados);
      }
    }).catch((e) => {
      this.erro = 'Erro ao processar o arquivo. Verifique se é uma planilha válida.';
      console.error(e);
    });
  }

  obterColunas(dados: any[]): string[] {
    return dados.length > 0 ? Object.keys(dados[0]) : [];
  }

  detectarTipos(dados: any[]): { [key: string]: string } {
    const tipos: { [key: string]: string } = {};
    if (dados.length > 0) {
      this.colunas.forEach(coluna => {
        // Verifica o tipo de cada valor na coluna e determina o tipo mais frequente
        const tiposColuna = dados.map(item => typeof item[coluna]);
        tipos[coluna] = tiposColuna.length ? tiposColuna[0] : 'unknown'; // Atribui 'unknown' caso não consiga determinar
      });
    }
    return tipos;
  }

  fecharModal(): void {
    const resultado = {
      dados: this.dados,
      colunas: this.colunas,
      tipos: this.tipos,
      target: this.target,
      atributos: this.atributos
    };
    this.dialogRef.close(resultado);
  }

  selecaoTarget() {
    if(this.atributos.hasOwnProperty(this.target)) {
      this.atributos[this.target] = false
    }
  }
}
