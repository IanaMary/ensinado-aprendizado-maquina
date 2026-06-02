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

  @Output() atualizarResultadoAvaliacoes = new EventEmitter<any>();

  itensMetricas: ItemPipeline[] = [];
  modelosAvaliados: string[] = [];
  metricsAvaliadas: string[] = [];

  tooltipInfo: { linha: number; coluna: number; valor: number; tipo: string; classeReal: string; classePredita: string } | null = null;

  private mapaLabel = new Map<string, string>();

  constructor(private dashboardService: DashboardService) { }
  cont = 0;

  ngOnChanges(changes: SimpleChanges): void {
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

  isConfusionMatrix(value: any): boolean {
    return value && typeof value === 'object' && 'matriz' in value && 'classes' in value;
  }

  getClasseLabel(value: any, idx: number): string {
    if (this.isConfusionMatrix(value)) {
      return value.classes[idx] || `Classe ${idx}`;
    }
    return `Classe ${idx}`;
  }

  getCellColor(valor: number, max: number): string {
    if (max === 0) return '#f5f5f5';
    const intensidade = valor / max;
    if (intensidade === 0) return '#f5f5f5';
    if (intensidade < 0.3) return '#c8e6c9';
    if (intensidade < 0.6) return '#81c784';
    if (intensidade < 0.8) return '#4caf50';
    return '#2e7d32';
  }

  getCellTextColor(valor: number, max: number): string {
    if (max === 0) return '#666';
    const intensidade = valor / max;
    return intensidade > 0.5 ? '#fff' : '#333';
  }

  getCellType(linha: number, coluna: number, total: number): string {
    if (linha === coluna) return 'VP';
    return 'Erro';
  }

  getCellTypeDetailed(linha: number, coluna: number, classes: string[]): string {
    if (linha === coluna) {
      return `VP (${classes[linha]})`;
    }
    return `Erro`;
  }

  getTotalErros(matriz: number[][]): number {
    let erros = 0;
    for (let i = 0; i < matriz.length; i++) {
      for (let j = 0; j < matriz[i].length; j++) {
        if (i !== j) erros += matriz[i][j];
      }
    }
    return erros;
  }

  getAcuracia(matriz: number[][]): number {
    let corretos = 0;
    let total = 0;
    for (let i = 0; i < matriz.length; i++) {
      for (let j = 0; j < matriz[i].length; j++) {
        total += matriz[i][j];
        if (i === j) corretos += matriz[i][j];
      }
    }
    return total > 0 ? corretos / total : 0;
  }

  onCellHover(linha: number, coluna: number, valor: number, classes: string[]) {
    const tipo = linha === coluna ? 'Verdadeiro Positivo (VP)' : 'Erro de Classificação';
    this.tooltipInfo = {
      linha,
      coluna,
      valor,
      tipo,
      classeReal: classes[linha],
      classePredita: classes[coluna]
    };
  }

  onCellLeave() {
    this.tooltipInfo = null;
  }
}
