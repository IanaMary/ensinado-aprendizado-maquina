import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado } from '../../../../models/item-coleta-dado.model';
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
  }

  carregarItensPreProcessamento() {
    this.dashboardService.getItensPreProcessamento().subscribe(itens => {
      this.itensDisponiveis = [...itens];
      // Remover itens ja selecionados da lista de disponiveis
      if (this.preProcessamentoConfig?.itens) {
        const valoresSelecionados = this.preProcessamentoConfig.itens.map(i => i.valor);
        this.itensDisponiveis = this.itensDisponiveis.filter(
          i => !valoresSelecionados.includes(i.valor)
        );
      }
    });
  }

  adicionarItem(item: any) {
    // Adicionar com todas as colunas por padrão
    this.itensSelecionados.push({
      valor: item.valor,
      label: item.label,
      colunas: [...this.colunas]
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

  private emitirConfig() {
    this.preProcessamentoModificado.emit({
      itens: this.itensSelecionados
    });
  }
}
