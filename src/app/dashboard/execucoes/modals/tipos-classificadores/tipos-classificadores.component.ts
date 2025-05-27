import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ItemPipeline, TipoTarget } from '../../../../models/item-coleta-dado.model';
import itensPipeline  from '../../../../constants/itens-coletas-dados.json'
import { DashboardService } from '../../../services/dashboard.service';


@Component({
  selector: 'app-tipos-classificadores',
  templateUrl: './tipos-classificadores.component.html',
  styleUrls: ['./tipos-classificadores.component.scss'],
  standalone: false
})
export class TiposClassificadoresComponent implements OnChanges {

  @Input() tipoTarget: TipoTarget = undefined;
  @Input() modeloSelecionado: ItemPipeline | undefined;
  @Output() selecaoModelo = new EventEmitter<ItemPipeline>();


  todosModelos = itensPipeline.itensTreino as ItemPipeline[];

  modelosDisponiveis: ItemPipeline[] = [];
  modelo!: ItemPipeline | undefined;
  modeloValor: string | undefined;

  target: TipoTarget = undefined;

  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges): void {
 
    if (changes['tipoTarget']?.currentValue) {
      this.target = changes['tipoTarget'].currentValue
    } else {
      this.target = this.modeloSelecionado ? this.modeloSelecionado.tipo : this.tipoTarget;
    }
    this.modelosDisponiveis = this.todosModelos.filter(m => m.tipo === this.target);
    this.modeloValor = this.modeloSelecionado ? this.modeloSelecionado.valor : this.modelosDisponiveis[0].valor;
    setTimeout(() => this.emitSelecaoModelo());
  }

  emitSelecaoModelo() {
    this.modelo = this.modelosDisponiveis.find(m => m.valor === this.modeloValor);
    this.selecaoModelo.emit(this.modelo);
  }


}
