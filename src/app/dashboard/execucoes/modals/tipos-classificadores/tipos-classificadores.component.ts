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
  @Input() modelosAgrupados: { tipo: string; titulo: string; modelos: any[] }[] = [];
  @Output() selecaoModelo = new EventEmitter<ItemPipeline>();
  @Output() hiperparametrosModificados = new EventEmitter<Record<string, any>>();

  modelo!: ItemPipeline | undefined;
  modeloValor: string | undefined;
  hiperparametrosArray: any[] = [];
  hiperparametrosAvancados: any[] = [];
  mostrarAvancados = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modeloSelecionado'] && this.modeloSelecionado?.valor) {
      this.modeloValor = this.modeloSelecionado.valor;
      this.carregarHiperparametros();
    }
  }

  // Modelos de tipo incompativel com o target ficam desabilitados (nao selecionaveis).
  selecionarModelo(model: any) {
    if (model?.compativel === false) return;
    this.modeloValor = model.valor;
    this.emitSelecaoModelo();
  }

  private todosModelos(): any[] {
    if (this.modelosAgrupados?.length) {
      return this.modelosAgrupados.flatMap(g => g.modelos);
    }
    return this.modelosDisponiveis;
  }

  emitSelecaoModelo() {
    this.modelo = this.todosModelos().find(m => m.valor === this.modeloValor);
    if (this.modelo) {
      this.selecaoModelo.emit(this.modelo);
      this.carregarHiperparametros();
    }
  }

  private carregarHiperparametros() {
    const modelos = tutor.modelos as any;
    const modeloInfo = modelos?.[this.modeloValor || ''];

    const todos = modeloInfo?.hiperparametros
      ? Object.entries(modeloInfo.hiperparametros).map(([key, value]: [string, any]) => ({
          key,
          nome: value.nome,
          valor: value.padrao,
          ...value
        }))
      : [];

    // Avancados (avancado: true) vao para uma secao recolhivel separada.
    this.hiperparametrosArray = todos.filter((p: any) => !p.avancado);
    this.hiperparametrosAvancados = todos.filter((p: any) => p.avancado);
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
    for (const param of [...this.hiperparametrosArray, ...this.hiperparametrosAvancados]) {
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
