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
  itensSelecionados: { valor: string; label: string; colunas: string[] }[] = [];
  itemSelecionado: any = null;
  colunas: string[] = [];
  colunasSelecionadas: string[] = [];

  ngOnInit() {
    this.carregarItensPreProcessamento();
    if (this.resultadoColetaDado?.colunas) {
      this.colunas = this.resultadoColetaDado.colunas;
    }
  }

  carregarItensPreProcessamento() {
    const itens = (tutor as any).itensPreProcessamento || [];
    this.itensDisponiveis = itens;
  }

  selecionarItem(item: any) {
    this.itemSelecionado = item;
    this.colunasSelecionadas = [];
  }

  toggleColuna(coluna: string) {
    const idx = this.colunasSelecionadas.indexOf(coluna);
    if (idx >= 0) {
      this.colunasSelecionadas.splice(idx, 1);
    } else {
      this.colunasSelecionadas.push(coluna);
    }
  }

  isColunaSelecionada(coluna: string): boolean {
    return this.colunasSelecionadas.includes(coluna);
  }

  selecionarTodas() {
    this.colunasSelecionadas = [...this.colunas];
  }

  limparSelecao() {
    this.colunasSelecionadas = [];
  }

  adicionarItem() {
    if (!this.itemSelecionado || this.colunasSelecionadas.length === 0) return;

    this.itensSelecionados.push({
      valor: this.itemSelecionado.valor,
      label: this.itemSelecionado.label,
      colunas: [...this.colunasSelecionadas]
    });

    // Remover item da lista de disponiveis
    this.itensDisponiveis = this.itensDisponiveis.filter(i => i.valor !== this.itemSelecionado.valor);
    this.itemSelecionado = null;
    this.colunasSelecionadas = [];

    this.emitirConfig();
  }

  removerItem(idx: number) {
    const item = this.itensSelecionados[idx];
    this.itensSelecionados.splice(idx, 1);

    // Recolocar na lista de disponiveis
    this.itensDisponiveis.push(item);
    this.emitirConfig();
  }

  private emitirConfig() {
    this.preProcessamentoModificado.emit({
      itens: this.itensSelecionados
    });
  }
}
