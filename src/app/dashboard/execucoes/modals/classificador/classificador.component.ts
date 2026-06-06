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
      if (valor && !jaTreinado && !this.treinando) {
        this.enviarParaClassificador(valor);
      }
    }
  }



  async enviarParaClassificador(classificador: string) {
    this.treinando = true
    const tipoClassficador = (classificador ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    const arquivoId = this.sessionService.getColetaId();
    const configuracaoId = this.sessionService.getConfigurcaoTreinamento();
    const modeloId = this.modeloSelecionado?.id;

    if (!arquivoId || !configuracaoId || !modeloId) {
      this.treinando = false;
      this.resultadoTreinamento = {
        ...this.resultadoTreinamento,
        [(modeloId ?? classificador ?? 'modelo')]: {
          erro: true,
          status: 'IDs ausentes: faça upload de dados e selecione o modelo antes de treinar.'
        }
      };
      this.atualizarResultadoTreinamento.emit(this.resultadoTreinamento);
      return;
    }

    const body = {
      tipo_arquivo: 'xlsx',
      arquivo_id: arquivoId,
      configuracao_id: configuracaoId,
      modelo_id: modeloId
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
