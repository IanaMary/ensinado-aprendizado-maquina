import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { ItemPipeline, ResultadoColetaDado } from '../../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-classificador',
  templateUrl: './classificador.component.html',
  styleUrls: ['./classificador.component.scss'],
  standalone: false
})
export class ClasificadorComponent implements OnChanges {

  @Input() modeloSelecionado: ItemPipeline | undefined;
  @Input() resultadoColetaDado: ResultadoColetaDado | undefined;
  resultadoClassificador: any;

  constructor(
    private dashboardService: DashboardService
  ) { }


  ngOnChanges(changes: SimpleChanges): void { }

  enviarParaClassificador() {
    const tipoClassficador = this.modeloSelecionado?.valor ?? '';
    const att = this.resultadoColetaDado?.treino.atributos ?? {};
    const body = {
      dados_treino: this.resultadoColetaDado?.treino.dados,
      dados_teste: this.resultadoColetaDado?.teste?.dados,
      target: this.resultadoColetaDado?.treino.target,
      atributos: Object.keys(att).filter(chave => att[chave])
    };

    this.dashboardService.classificadorTreino(tipoClassficador, body).subscribe({
      next: (res) => {
        this.resultadoClassificador = res;
      },
      error: (err) => {
        console.error('Erro ao treinar o modelo - classificador', err);
      }
    });
  }


}
