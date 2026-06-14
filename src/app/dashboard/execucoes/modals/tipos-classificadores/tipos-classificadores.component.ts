import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ItemPipeline } from '../../../../models/item-coleta-dado.model';
import tutor from '../../../../constants/tutor.json'


@Component({
  selector: 'app-tipos-classificadores',
  templateUrl: './tipos-classificadores.component.html',
  styleUrls: ['./tipos-classificadores.component.scss'],
  standalone: false
})
export class TiposClassificadoresComponent implements OnChanges {

  @Input() modeloSelecionado: ItemPipeline | undefined;
  @Input() modelosDisponiveis: ItemPipeline[] = [];
  @Output() selecaoModelo = new EventEmitter<ItemPipeline>();
  @Output() hiperparametrosModificados = new EventEmitter<Record<string, any>>();

  modelo!: ItemPipeline | undefined;
  modeloValor: string | undefined;
  hiperparametrosArray: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modeloSelecionado'] && this.modeloSelecionado?.valor) {
      this.modeloValor = this.modeloSelecionado.valor;
      this.carregarHiperparametros();
    }
  }

  emitSelecaoModelo() {
    this.modelo = this.modelosDisponiveis.find(m => m.valor === this.modeloValor);
    if (this.modelo) {
      this.selecaoModelo.emit(this.modelo);
      this.carregarHiperparametros();
    }
  }

  private carregarHiperparametros() {
    const modelos = tutor.modelos as any;
    const modeloInfo = modelos?.[this.modeloValor || ''];

    if (modeloInfo?.hiperparametros) {
      this.hiperparametrosArray = Object.entries(modeloInfo.hiperparametros).map(([key, value]: [string, any]) => ({
        key,
        nome: value.nome,
        valor: value.padrao,
        ...value
      }));
    } else {
      this.hiperparametrosArray = [];
    }
    this.emitHiperparametros();
  }

  atualizarHiperparametro(param: any, valor: any) {
    param.valor = valor;
    this.emitHiperparametros();
  }

  // Emite os hiperparametros no formato { nome_sklearn: valor }, convertendo o
  // texto dos inputs para o tipo correto (int/float/bool) antes de enviar ao treino.
  private emitHiperparametros() {
    const valores: Record<string, any> = {};
    for (const param of this.hiperparametrosArray) {
      const nome = param.sklearn || param.key;
      valores[nome] = this.converterValor(param.valor, param.tipo);
    }
    this.hiperparametrosModificados.emit(valores);
  }

  private converterValor(valor: any, tipo: string): any {
    if (valor === null || valor === undefined || valor === '') return null;
    const t = (tipo || '').toLowerCase();
    if (t.includes('int')) {
      const n = parseInt(valor, 10);
      return isNaN(n) ? null : n;
    }
    if (t.includes('float')) {
      const n = parseFloat(valor);
      return isNaN(n) ? null : n;
    }
    if (t === 'bool') {
      return valor === true || valor === 'true';
    }
    return valor;
  }

}
