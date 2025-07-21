import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { ItemPipeline, ResultadoColetaDado, nomeModelos } from '../../../../models/item-coleta-dado.model';

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
    private dashboardService: DashboardService
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
    const body = await this.criarBody()

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

  async criarBody(): Promise<any> {

    const hiperparametros = this.modeloSelecionado?.hiperparametros?.reduce((obj: Record<string, any>, hp: any) => {
      obj[hp.nomeHiperparametro] = hp.valorPadrao;
      return obj;
    }, {}) ?? {};

    const atributosMap = this.resultadoColetaDado?.treino.atributos ?? {};
    const porcentagem = this.resultadoColetaDado?.treino?.porcentagemTreino ?? 70;
    return {
      porcentagem_teste: (100 - porcentagem) / 100,
      dados_treino: this.resultadoColetaDado?.treino.dados,
      dados_teste: this.resultadoColetaDado?.teste?.dados,
      target: this.resultadoColetaDado?.treino.target,
      atributos: Object.keys(atributosMap).filter(chave => atributosMap[chave]),
      hiperparametros
    };
  }



  get atributosFormatados(): string {
    const atributos = this.resultadoColetaDado?.treino?.atributos;
    if (!atributos) {
      return 'Nenhum atributo disponível';
    }
    const selecionados = Object.keys(atributos).filter(chave => atributos[chave]);
    return selecionados.length ? selecionados.join(', ') : 'Nenhum atributo disponível';
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
