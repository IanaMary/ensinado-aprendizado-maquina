import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { ItemPipeline, ResultadoColetaDado, nomeModelos } from '../../../../models/item-coleta-dado.model';
import { itensTreino } from '../../../../constants/itens-coletas-dados.json';
import { SessionService } from '../../../../service/sessao-store.service';


@Component({
  selector: 'app-classificador',
  templateUrl: './classificador.component.html',
  styleUrls: ['./classificador.component.scss'],
  standalone: false
})
export class ClasificadorComponent implements OnChanges {

  @Input() resultadoTreinamento: Record<string, any> = {};
  @Input() modeloSelecionado: ItemPipeline | undefined;
  @Input() resultadoColetaDado: ResultadoColetaDado | undefined;
  @Output() atualizarResultadoTreinamento = new EventEmitter<any>();

  treinando = false;

  constructor(
    private dashboardService: DashboardService,
    private sessionService: SessionService
  ) { }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resultadoColetaDado'] || changes['modeloSelecionado']) {
      const valor = this.modeloSelecionado?.valor;
      const jaTreinado = this.resultadoTreinamento && valor ? this.resultadoTreinamento.hasOwnProperty(valor) : false;
      if (valor && !jaTreinado) {
        this.enviarParaClassificador(valor);
      }
    }
  }



  async enviarParaClassificador(classificador: string) {
    this.treinando = true
    const tipoClassficador = classificador ?? '';
    const body = {
      tipo_arquivo: 'xlsx',
      arquivo_id: this.sessionService.getColetaId(),
      configuracao_id: this.sessionService.getConfigurcaoTreinamento(),
      modelo_id: this.modeloSelecionado?.id
    }

    this.dashboardService.classificadorTreino(tipoClassficador, body).subscribe({
      next: (res: any) => {
        const modelo = res.modelo
        this.resultadoTreinamento = {
          ...this.resultadoTreinamento,
          [modelo]: res
        };
        this.treinando = false
        this.atualizarResultadoTreinamento.emit(this.resultadoTreinamento)
      },
      error: (err) => {
        this.treinando = false
      }
    });
  }


  getLabel(valor: string): string {
    return nomeModelos[valor] ?? valor;
  }


  getModelosComResultado(): string[] {
    if (!this.resultadoTreinamento) {
      return [];
    }
    return Object.keys(this.resultadoTreinamento);
  }
}
