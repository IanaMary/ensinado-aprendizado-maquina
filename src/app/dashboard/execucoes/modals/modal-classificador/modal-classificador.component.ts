import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DashboardService } from '../../../services/dashboard.service';

@Component({
  selector: 'app-modal-classificador',
  templateUrl: './modal-classificador.component.html',
  styleUrls: ['./modal-classificador.component.scss'],
  standalone: false
})
export class ModalClasificadorComponent {

  dados: any[] = [];
  dadosTeste: any[] = [];
  target: string = '';
  atributos: { [key: string]: boolean } = {};
  resultadoClassificador: any = null;

  constructor(
    public dialogRef: MatDialogRef<ModalClasificadorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dashboardService: DashboardService
  ) {
    if (data) {
      this.dados = data.dados || [];
      this.dadosTeste = data.dadosTeste || [];
      this.target = data.target || '';
      this.atributos = data.atributos || {};
    }
  }

  enviarParaClassificador() {
    const body = {
      dados_treino: this.dados,
      dados_teste: this.dadosTeste,
      target: this.target,
      atributos: Object.keys(this.atributos).filter(chave => this.atributos[chave])
    };

    this.dashboardService.classificadorTreino(body).subscribe({
      next: (res) => {
        this.resultadoClassificador = res;
        console.log('Modelo treinado com sucesso - classificador', res);
        // this.fecharModal();
      },
      error: (err) => {
        console.error('Erro ao treinar o modelo - classificador', err);
      }
    });
  }

  fecharModal() {
    this.dialogRef.close();
  }
}
