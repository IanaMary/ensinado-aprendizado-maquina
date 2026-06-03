import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ItemPipeline, TipoTarget } from '../../../../models/item-coleta-dado.model';
import itensPipeline from '../../../../constants/itens-coletas-dados.json'
import tutor from '../../../../constants/tutor.json'
import { DashboardService } from '../../../services/dashboard.service';


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
  modeloInfo: any = null;
  hiperparametrosArray: any[] = [];


  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modeloSelecionado'] && this.modeloSelecionado?.valor) {
      this.modeloValor = this.modeloSelecionado.valor;
      this.carregarModeloInfo();
    }
  }


  emitSelecaoModelo() {
    this.modelo = this.modelosDisponiveis.find(m => m.valor === this.modeloValor);
    if (this.modelo) {
      this.selecaoModelo.emit(this.modelo);
      this.carregarModeloInfo();
    }
  }

  private carregarModeloInfo() {
    const modelos = tutor.modelos as any;
    this.modeloInfo = modelos?.[this.modeloValor || ''] || null;
    
    if (this.modeloInfo?.hiperparametros) {
      this.hiperparametrosArray = Object.entries(this.modeloInfo.hiperparametros).map(([key, value]: [string, any]) => ({
        key,
        ...value
      }));
    } else {
      this.hiperparametrosArray = [];
    }
  }

}
