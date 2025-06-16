import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { ItemPipeline, nomeDasMetricas } from '../../../../models/item-coleta-dado.model';

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
  @Input() itensMetricas: { label: string; valor: string }[] = [];  // Insira o JSON das métricas aqui via input

  @Output() atualizarResultadoAvaliacoes = new EventEmitter<any>();

  private mapaLabel = new Map<string, string>();

  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges): void {
    // Reconstrói o mapa toda vez que itensMetricas mudar para garantir label atualizado
    if (this.itensMetricas?.length) {
      this.mapaLabel.clear();
      this.itensMetricas.forEach(m => this.mapaLabel.set(m.valor, m.label));
    }

    if (this.metricasSelecionadas && this.resultadosDasAvaliacoes?.resultados) {
      // Mantém só as métricas selecionadas no objeto resultados
      this.resultadosDasAvaliacoes.resultados = this.metricasSelecionadas.reduce((acc, { valor }) => {
        if (valor) {
          acc[valor] = this.resultadosDasAvaliacoes.resultados?.[valor] ?? null;
        }
        return acc;
      }, {} as Record<string, any>);
    }
  }

  postAvaliacao() {
    const body = {
      dados_teste: this.resultadoTreinamento.teste,
      target: this.resultadoTreinamento.target,
      atributos: this.resultadoTreinamento.atributos,
      modelo_nome: this.resultadoTreinamento.modelo,
      metricas: this.metricasSelecionadas
        .map(objeto => objeto.valor)
        .filter(v => v != null)  // filtra possíveis valores nulos ou indefinidos
    };

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

  get metricas(): string[] {
    return Object.keys(this.resultadosDasAvaliacoes?.resultados || {});
  }

   getLabel(valor: string): string {
    return nomeDasMetricas[valor] ?? valor;
  }

  isNumber(value: any): boolean {
    return typeof value === 'number';
  }
}
