import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import tutor from '../../constants/tutor.json';

export interface TutorContexto {
  titulo: string;
  descricao: string;
  itens?: string[];
  modelo?: any;
  metrica?: any;
}

@Component({
  selector: 'app-tutor',
  templateUrl: './tutor.component.html',
  styleUrls: ['./tutor.component.scss'],
  standalone: false
})
export class TutorComponent implements OnChanges {

  @Input() tutorGeral: any;
  @Input() resumo: string[] = [];
  @Input() explicacao: string[] = [];
  @Input() contexto: TutorContexto | null = null;
  @Input() modeloSelecionado: any = null;
  @Input() metricaSelecionada: any = null;

  tutor = tutor;
  objectKeys = Object.keys;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modeloSelecionado'] && this.modeloSelecionado) {
      this.buildModeloContexto();
    }
    if (changes['metricaSelecionada'] && this.metricaSelecionada) {
      this.buildMetricaContexto();
    }
  }

  private buildModeloContexto(): void {
    const modeloKey = this.modeloSelecionado?.valor;
    const modelos = this.tutor.modelos as any;
    const modeloInfo = modelos?.[modeloKey];
    if (!modeloInfo) return;

    this.contexto = {
      titulo: modeloInfo.nome,
      descricao: modeloInfo.descricao,
      itens: modeloInfo.comoFunciona,
      modelo: modeloInfo
    };
  }

  private buildMetricaContexto(): void {
    const metricaKey = this.metricaSelecionada?.valor;
    const metricas = this.tutor.metricas as any;
    const metricaInfo = metricas?.[metricaKey];
    if (!metricaInfo) return;

    this.contexto = {
      titulo: metricaInfo.nome,
      descricao: metricaInfo.descricao,
      itens: metricaInfo.quandoUsar || metricaInfo.comoLer,
      metrica: metricaInfo
    };
  }
}
