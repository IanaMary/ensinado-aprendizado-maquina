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
  }

  atualizarHiperparametro(param: any, valor: any) {
    param.valor = valor;
  }

}
