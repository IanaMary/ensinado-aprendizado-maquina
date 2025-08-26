import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { ItemPipeline, nomeMetricas } from '../../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-metrica-avaliacao',
  templateUrl: './metrica-avaliacao.component.html',
  styleUrls: ['./metrica-avaliacao.component.scss'],
  standalone: false
})
export class MetricaAvaliacaoComponent implements OnChanges, OnInit {

  @Input() resultadoTreinamento: any;
  @Input() resultadosDasAvaliacoes: any = {};
  @Input() metricasSelecionadas: ItemPipeline[] = [];
  itensMetricas: ItemPipeline[] = [];
  modelosAvaliados: string[] = [];
  metricsAvaliadas: string[] = [];




  @Output() atualizarResultadoAvaliacoes = new EventEmitter<any>();

  private mapaLabel = new Map<string, string>();

  constructor(private dashboardService: DashboardService) { }
  cont = 0;

  ngOnChanges(changes: SimpleChanges): void {

    const naoExisteAvaliacao = Object.keys(this.resultadosDasAvaliacoes).length === 0;
    if (naoExisteAvaliacao) {
      this.postAvaliacao();
    }
  }

  ngOnInit(): void {
    this.atualizarVariaveis();
  }


  async postAvaliacao() {

    const body = {
      modelos: Object.values(this.resultadoTreinamento).map((e: any) => ({ id: e.id, label: e.nome_modelo })),
      metricas: this.metricasSelecionadas.map((e: any) => ({ valor: e.valor, label: e.label }))
    };

    this.dashboardService.postMetricas(body).subscribe({
      next: (res) => {
        this.resultadosDasAvaliacoes = res;
        this.atualizarVariaveis()
        this.atualizarResultadoAvaliacoes.emit(this.resultadosDasAvaliacoes);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  atualizarVariaveis() {
    this.metricsAvaliadas = Object.keys(this.resultadosDasAvaliacoes);
    this.modelosAvaliados = this.metricsAvaliadas.length > 0
      ? Object.keys(this.resultadosDasAvaliacoes[this.metricsAvaliadas[0]])
      : [];
  }


  isNumber(value: any): boolean {
    return typeof value === 'number';
  }
}
