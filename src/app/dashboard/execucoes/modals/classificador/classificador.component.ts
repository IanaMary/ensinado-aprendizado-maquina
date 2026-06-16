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
  @Input() hiperparametros: Record<string, any> = {};
  @Input() preProcessamentoConfig: any = null;
  @Output() atualizarResultadoTreinamento = new EventEmitter<any>();

  treinando = false;
  modelosJaTreinados = new Set<string>();

  constructor(
    private dashboardService: DashboardService,
    private sessionService: SessionService
  ) { }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resultadoColetaDado'] || changes['modeloSelecionado']) {
      const valor = this.modeloSelecionado?.valor;
      // Use the backend's returned key format (with accents) for checking
      // The backend returns modelo as "árvore_de_decisão" (with accents)
      const chaveBackend = this.modeloSelecionado?.valor
        ?.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
      const jaTreinado = this.resultadoTreinamento && valor 
        ? (this.resultadoTreinamento.hasOwnProperty(valor) || this.resultadoTreinamento.hasOwnProperty(chaveBackend || ''))
        : false;
      const jaProcessando = this.modelosJaTreinados.has(valor || '') || this.modelosJaTreinados.has(chaveBackend || '');
      if (valor && !jaTreinado && !jaProcessando) {
        this.modelosJaTreinados.add(valor);
        this.modelosJaTreinados.add(chaveBackend || '');
        this.enviarParaClassificador(valor);
      }
    }
  }



  async enviarParaClassificador(classificador: string) {
    this.treinando = true
    // Use the modeloSelecionado.valor directly (already correct in JSON: 'arvore_decisao', 'knn', etc.)
    // instead of normalizing the label which adds unwanted "de"
    const tipoClassficador = this.modeloSelecionado?.valor ?? classificador;
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

    // Envia o pré-processamento montado no pipeline gráfico para o backend aplicá-lo
    // de fato (vira um sklearn Pipeline junto do modelo), mantendo o modelo treinado
    // coerente com o código gerado.
    const preProcessamento = (this.preProcessamentoConfig?.itens || []).map((item: any) => ({
      valor: item.valor,
      colunas: item.colunas || []
    }));

    const body = {
      tipo_arquivo: 'xlsx',
      arquivo_id: arquivoId,
      configuracao_id: configuracaoId,
      modelo_id: modeloId,
      hiperparametros: this.hiperparametros || {},
      pre_processamento: preProcessamento
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
        console.error(err);
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

  getHiperparametrosArray(hiperparametros: any, hiperparametrosPadrao?: any): { nome: string; valor: any; isDefault: boolean }[] {
    if (!hiperparametros) return [];
    return Object.entries(hiperparametros).map(([key, value]) => {
      const valorPadrao = hiperparametrosPadrao?.[key];
      const isDefault = valorPadrao !== undefined && valorPadrao === value;
      return {
        nome: key,
        valor: value,
        isDefault
      };
    });
  }
}
