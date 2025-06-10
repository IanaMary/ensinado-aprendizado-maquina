import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { ItemPipeline } from '../../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-metrica-avaliacao',
  templateUrl: './metrica-avaliacao.component.html',
  styleUrls: ['./metrica-avaliacao.component.scss'],
  standalone: false
})
export class MetricaAvaliacaoComponent implements OnChanges {

  @Input() resultadoTreinamento: any;
  @Input() resultadosDasAvaliacoes: any;
  @Input() metricasSelecionadas: ItemPipeline[] = [];
  @Output() atualizarResultadoAvaliacoes = new EventEmitter<any>();

  
  constructor(
    private dashboardService: DashboardService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {}

  postAvaliacao() {

    const body = {
      dados_teste: this.resultadoTreinamento.teste,
      target: this.resultadoTreinamento.target,
      atributos: this.resultadoTreinamento.atributos,
      modelo_nome: this.resultadoTreinamento.modelo,
      metricas: this.metricasSelecionadas.map(objeto => objeto.valor)
    };

    this.dashboardService.postMetricas(body).subscribe({
      next: (res) => {
        this.resultadosDasAvaliacoes = res;
        this.atualizarResultadoAvaliacoes.emit(res);
      },
      error: (err) => {}
    });
  }

  get metricas(): string[] {
    return Object.keys(this.resultadosDasAvaliacoes?.resultados || {});
  }

  isNumber(value: any): boolean {
    return typeof value === 'number';
  }

}

