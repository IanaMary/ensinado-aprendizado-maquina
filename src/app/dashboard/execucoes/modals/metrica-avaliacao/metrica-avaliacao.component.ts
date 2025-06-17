import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { ItemPipeline, nomeMetricas } from '../../../../models/item-coleta-dado.model';

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
  itensMetricas: ItemPipeline[] = [];
  modelosAvaliados: string[] = [];
  metricsAvaliadas: string[] = [];

  @Output() atualizarResultadoAvaliacoes = new EventEmitter<any>();

  private mapaLabel = new Map<string, string>();

  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['resultadosDasAvaliacoes'] && changes['resultadosDasAvaliacoes'].previousValue !== changes['resultadosDasAvaliacoes'].currentValue) {
      this.atualizarVariaveis();
    }
  }

  atualizarVariaveis() {
    this.dashboardService.getItensMetricas().subscribe(itens => {
      this.itensMetricas = itens;
    });

    if (this.resultadosDasAvaliacoes) {
      this.modelosAvaliados = Object.keys(this.resultadosDasAvaliacoes);

      if (this.modelosAvaliados.length > 0) {
        const primeiroModelo = this.modelosAvaliados[0];
        this.metricsAvaliadas = Object.keys(this.resultadosDasAvaliacoes[primeiroModelo]?.resultados || {});
      } else {
        this.metricsAvaliadas = [];
      }

    } else {
      this.modelosAvaliados = [];
      this.metricsAvaliadas = [];
    }
  }


  async postAvaliacao() {

    const body = await this.criarBody();
    this.dashboardService.postMetricas(body).subscribe({
      next: (res) => {
        this.resultadosDasAvaliacoes = res;
        this.atualizarResultadoAvaliacoes.emit(res);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  async criarBody(): Promise<any> {


    const modelosNomes = Object.keys(this.resultadoTreinamento);

    // Filtra apenas as métricas habilitadas
    const metricasHabilitadas = this.itensMetricas
      .filter(m => m.habilitado)
      .map(m => m.valor);

    // Monta as avaliações respeitando o mapa
    const avaliacoes = modelosNomes.map(modeloNome => {
      const metricasEsperadas = this.dashboardService.getMetricasPorModelo(modeloNome, true);

      const metricasModelo = metricasHabilitadas.filter(m => metricasEsperadas.includes(m));

      return {
        modelo_nome: modeloNome,
        metricas: metricasModelo
      };
    });

    // Assume que os dados de teste são iguais para todos os modelos
    const primeiroModelo = this.resultadoTreinamento[modelosNomes[0]];

    return {
      dados_teste: primeiroModelo.teste,
      target: primeiroModelo.target,
      atributos: primeiroModelo.atributos,
      avaliacoes: avaliacoes
    };


  }




  get modelos(): string[] {
    return this.resultadosDasAvaliacoes ? Object.keys(this.resultadosDasAvaliacoes) : [];
  }

  getLabel(valor: string): string {
    return nomeMetricas[valor] ?? valor;
  }

  isNumber(value: any): boolean {
    return typeof value === 'number';
  }
}
