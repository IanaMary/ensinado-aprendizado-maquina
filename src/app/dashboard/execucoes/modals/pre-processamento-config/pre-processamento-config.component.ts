import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado } from '../../../../models/item-coleta-dado.model';
import tutor from '../../../../constants/tutor.json';

export interface PreProcessamentoConfig {
  itens: { valor: string; label: string; colunas: string[] }[];
}

@Component({
  selector: 'app-pre-processamento-config',
  templateUrl: './pre-processamento-config.component.html',
  styleUrls: ['./pre-processamento-config.component.scss'],
  standalone: false
})
export class PreProcessamentoConfigComponent {
  @Input() resultadoColetaDado?: ResultadoColetaDado;
  @Output() preProcessamentoModificado = new EventEmitter<PreProcessamentoConfig>();

  tutor = tutor;
  itensDisponiveis: any[] = [];
  itensSelecionados: any[] = [];
  colunas: string[] = [];

  ngOnInit() {
    this.carregarItensPreProcessamento();
    if (this.resultadoColetaDado?.colunas) {
      this.colunas = this.resultadoColetaDado.colunas.filter(
        c => c !== this.resultadoColetaDado?.target
      );
    }
  }

  carregarItensPreProcessamento() {
    const itens = (tutor as any).itensPreProcessamento || [];
    this.itensDisponiveis = [...itens];
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
