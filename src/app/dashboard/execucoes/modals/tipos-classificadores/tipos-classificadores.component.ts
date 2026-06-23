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
  /** Pedido de ajuda contextual sobre um modelo → o modal abre no tutor/chatbot. */
  @Output() ajudaItem = new EventEmitter<any>();

  pedirAjuda(event: Event, model: any) {
    event.stopPropagation();
    this.ajudaItem.emit(model);
  }

  modelo!: ItemPipeline | undefined;
  modeloValor: string | undefined;
  hiperparametrosArray: any[] = [];
  hiperparametrosAvancados: any[] = [];
  mostrarAvancados = false;
  // Grupos de preditores colapsáveis (auto-colapsa os totalmente incompatíveis).
  gruposColapsados: Record<string, boolean> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modeloSelecionado'] && this.modeloSelecionado?.valor) {
      this.modeloValor = this.modeloSelecionado.valor;
      this.carregarHiperparametros();
    }
    if (changes['modelosAgrupados'] && this.modelosAgrupados?.length) {
      // Colapsa de início os grupos cujos modelos são todos incompatíveis.
      for (const g of this.modelosAgrupados) {
        this.gruposColapsados[g.tipo] = g.modelos.length > 0 && g.modelos.every(m => m.compativel === false);
      }
    }
  }

  toggleGrupo(tipo: string) {
    this.gruposColapsados[tipo] = !this.gruposColapsados[tipo];
  }

  isColapsado(tipo: string): boolean {
    return !!this.gruposColapsados[tipo];
  }

  // O bloco de hiperparâmetros aparece logo abaixo do grupo que contém o selecionado.
  grupoContemSelecionado(grupo: { modelos: any[] }): boolean {
    return !!this.modeloValor && grupo.modelos.some(m => m.valor === this.modeloValor);
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

    let todos: any[] = [];
    if (modeloInfo?.hiperparametros) {
      todos = Object.entries(modeloInfo.hiperparametros).map(([key, value]: [string, any]) => ({
        key,
        nome: value.nome,
        valor: value.padrao,
        ...value
      }));
    } else {
      // Modelo NOVO (fora do tutor.json estático): hiperparâmetros vêm do bloco
      // `execucao` do catálogo, para que apareçam na UI e cheguem ao treino/código.
      const m: any = this.modelo || this.modeloSelecionado;
      const execHip = m?.execucao?.hiperparametros;
      if (Array.isArray(execHip)) {
        todos = execHip.map((h: any) => {
          const nome = h.nome || h.nomeHiperparametro;
          return {
            key: nome, nome, sklearn: nome,
            valor: h.default ?? h.valorPadrao,
            tipo: h.tipo, opcoes: h.opcoes, avancado: false,
          };
        });
      }
    }

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
