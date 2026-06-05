import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado, TipoDado } from '../../../../models/item-coleta-dado.model';
import { DashboardService } from '../../../services/dashboard.service';

export interface PreProcessamentoConfig {
  itens: { valor: string; label: string; colunas: string[] }[];
}

@Component({
  selector: 'app-pre-processamento-config',
  templateUrl: './pre-processamento-config.component.html',
  styleUrls: ['./pre-processamento-config.component.scss'],
  standalone: false
})
export class PreProcessamentoConfigComponent implements OnInit {
  @Input() resultadoColetaDado?: ResultadoColetaDado;
  @Input() preProcessamentoConfig?: PreProcessamentoConfig;
  @Output() preProcessamentoModificado = new EventEmitter<PreProcessamentoConfig>();

  itensDisponiveis: any[] = [];
  itensSelecionados: any[] = [];
  colunas: string[] = [];
  colunasNumericas: string[] = [];
  colunasCategoricas: string[] = [];
  tiposColunas: Record<string, TipoDado> = {};

  constructor(private dashboardService: DashboardService) {}

  ngOnInit() {
    this.carregarItensPreProcessamento();
    this.carregarColunas();
    this.carregarConfiguracaoExistente();
  }

  carregarConfiguracaoExistente() {
    if (this.preProcessamentoConfig?.itens) {
      this.itensSelecionados = [...this.preProcessamentoConfig.itens];
    }
  }

  carregarColunas() {
    if (this.resultadoColetaDado?.colunas) {
      this.colunas = this.resultadoColetaDado.colunas.filter(
        c => c !== this.resultadoColetaDado?.target
      );
    }
    
    // Separar colunas por tipo
    if (this.resultadoColetaDado?.tipos && Object.keys(this.resultadoColetaDado.tipos).length > 0) {
      this.tiposColunas = this.resultadoColetaDado.tipos;
      this.colunasNumericas = this.colunas.filter(c => {
        const t = (this.tiposColunas[c] || '').toLowerCase();
        return t === 'número' || t === 'numero' || t === 'number';
      });
      this.colunasCategoricas = this.colunas.filter(c => {
        const t = (this.tiposColunas[c] || '').toLowerCase();
        return t === 'texto' || t === 'string' || t === 'booleano' || t === 'boolean';
      });
    } else if (this.resultadoColetaDado?.colunasDetalhes?.length) {
      this.colunasNumericas = this.resultadoColetaDado.colunasDetalhes
        .filter((d: any) => {
          const t = (d.tipo_coluna || '').toLowerCase();
          return t === 'numero' || t === 'número' || t === 'number';
        })
        .map((d: any) => d.nome_coluna);
      this.colunasCategoricas = this.resultadoColetaDado.colunasDetalhes
        .filter((d: any) => {
          const t = (d.tipo_coluna || '').toLowerCase();
          return t === 'texto' || t === 'string' || t === 'booleano' || t === 'boolean';
        })
        .map((d: any) => d.nome_coluna);
    } else {
      // Se não tiver informação de tipo, assume todas como numéricas
      this.colunasNumericas = [...this.colunas];
      this.colunasCategoricas = [];
    }
  }

  carregarItensPreProcessamento() {
    this.dashboardService.getItensPreProcessamento().subscribe(itens => {
      // Filtrar itens inadequados:
      // - LabelEncoder não deve estar disponível para features (é para target)
      // - OneHotEncoder e OrdinalEncoder devem ter pelo menos uma coluna categórica
      this.itensDisponiveis = itens.filter(item => 
        item.valor !== 'label_encoder'
      );
      
      // Remover itens já selecionados da lista de disponíveis
      if (this.preProcessamentoConfig?.itens) {
        const valoresSelecionados = this.preProcessamentoConfig.itens.map(i => i.valor);
        this.itensDisponiveis = this.itensDisponiveis.filter(
          i => !valoresSelecionados.includes(i.valor)
        );
      }
    });
  }

  // Retorna as colunas disponíveis para um determinado tipo de pré-processamento
  getColunasDisponiveis(item: any): string[] {
    switch (item.valor) {
      case 'onehot_encoder':
      case 'ordinal_encoder':
        // Encoders só podem ser aplicados a colunas categóricas (texto ou booleano)
        return this.colunasCategoricas;
      case 'standard_scaler':
      case 'minmax_scaler':
      case 'robust_scaler':
      case 'normalizer':
      case 'polynomial_features':
      case 'power_transformer':
        // Scalers e transformadores só podem ser aplicados a colunas numéricas
        return this.colunasNumericas;
      case 'simple_imputer':
        // Imputer pode ser aplicado a qualquer coluna
        return this.colunas;
      default:
        return this.colunas;
    }
  }

  // Verifica se um item pode ser adicionado (tem colunas disponíveis)
  podeAdicionar(item: any): boolean {
    const colunasDisponiveis = this.getColunasDisponiveis(item);
    return colunasDisponiveis.length > 0;
  }

  adicionarItem(item: any) {
    // Obter colunas disponíveis para este tipo de pré-processamento
    const colunasDisponiveis = this.getColunasDisponiveis(item);
    
    // Se não houver colunas disponíveis, não adicionar
    if (colunasDisponiveis.length === 0) {
      return;
    }

    // Adicionar com as colunas disponíveis por padrão
    this.itensSelecionados.push({
      valor: item.valor,
      label: item.label,
      colunas: [...colunasDisponiveis]
    });

    // Remover da lista de disponíveis
    this.itensDisponiveis = this.itensDisponiveis.filter(i => i.valor !== item.valor);
    this.emitirConfig();
  }

  removerItem(idx: number) {
    const item = this.itensSelecionados[idx];
    this.itensSelecionados.splice(idx, 1);
    this.itensDisponiveis.push(item);
    this.emitirConfig();
  }

  toggleColuna(itemIdx: number, coluna: string) {
    const item = this.itensSelecionados[itemIdx];
    if (!item) return;

    const idx = item.colunas.indexOf(coluna);
    if (idx >= 0) {
      item.colunas.splice(idx, 1);
    } else {
      item.colunas.push(coluna);
    }
    this.emitirConfig();
  }

  isColunaSelecionada(item: any, coluna: string): boolean {
    return item.colunas?.includes(coluna);
  }

  // Verifica se uma coluna está disponível para um item específico
  isColunaDisponivelParaItem(item: any, coluna: string): boolean {
    const colunasDisponiveis = this.getColunasDisponiveis(item);
    return colunasDisponiveis.includes(coluna);
  }

  // Retorna uma mensagem explicando por que um item não pode ser adicionado
  getMensagemIndisponivel(item: any): string {
    switch (item.valor) {
      case 'onehot_encoder':
      case 'ordinal_encoder':
        return 'Requer colunas categóricas (texto ou booleano)';
      case 'standard_scaler':
      case 'minmax_scaler':
      case 'robust_scaler':
      case 'normalizer':
      case 'polynomial_features':
      case 'power_transformer':
        return 'Requer colunas numéricas';
      default:
        return 'Nenhuma coluna disponível';
    }
  }

  private emitirConfig() {
    this.preProcessamentoModificado.emit({
      itens: this.itensSelecionados
    });
  }
}
