import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import tutor from '../../constants/tutor.json';

export interface TutorContexto {
  titulo: string;
  descricao: string;
  itens?: string[];
  modelo?: any;
  metrica?: any;
}

export interface TutorReferencia {
  titulo: string;
  autor?: string;
  url?: string;
  tipo?: 'livro' | 'paper' | 'doc' | 'video' | string;
  citacao?: string;
}

export interface TutorMidia {
  tipo?: 'imagem' | 'grafico' | 'diagrama' | string;
  url?: string;
  base64?: string;
  legenda?: string;
  fonte?: string;
}

export interface TutorItemInfo {
  titulo: string;
  descricao: string;
  dicas?: string[];
  conceitos?: { nome: string; desc: string }[];
  hiperparametros?: any;
  vantagens?: string[];
  desvantagens?: string[];
  quandoUsar?: string[];
  naoUsarQuando?: string[];
  formula?: string;
  intuicao?: string;
  exemplo?: string;
  midia?: TutorMidia[];
  referencias?: TutorReferencia[];
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
  @Input() tutorPipelineInfo: any = null;
  @Input() tutorItemInfo: TutorItemInfo | null = null;
  @Input() tutorTheme: string = 'default';

  tutor = tutor;
  objectKeys = Object.keys;

  /** Resolve o src de uma mídia: URL direta ou data-URI a partir de base64. */
  midiaSrc(m: TutorMidia): string {
    if (m?.url) return m.url;
    if (m?.base64) {
      return m.base64.startsWith('data:') ? m.base64 : `data:image/png;base64,${m.base64}`;
    }
    return '';
  }
  modoTutor: 'basico' | 'avancado' = 'basico';

  get themeClass(): string {
    return 'theme-' + this.tutorTheme;
  }

  get modoAvancado(): boolean {
    return this.modoTutor === 'avancado';
  }

  getExplicacaoBasica(): string {
    const texto = this.tutorItemInfo?.descricao
      || this.contexto?.modelo?.intuicao
      || this.contexto?.metrica?.intuicao
      || this.contexto?.descricao
      || this.tutorPipelineInfo?.descricao
      || '';

    return this.simplificarTermos(texto);
  }

  getTituloBasico(): string {
    if (this.contexto?.modelo) return 'Como pensar nesse modelo';
    if (this.contexto?.metrica) return 'Como ler essa métrica';
    return 'Em palavras simples';
  }

  simplificarTermos(texto: string): string {
    return (texto || '')
      .replace(/\bo target\b/gi, 'o que queremos prever')
      .replace(/\btarget\b/gi, 'o que queremos prever')
      .replace(/\bfeatures?\b/gi, 'pistas')
      .replace(/\baccuracy\b/gi, 'porcentagem de acertos')
      .replace(/\boverfitting\b/gi, 'quando o modelo decora os exemplos')
      .replace(/\bunderfitting\b/gi, 'quando o modelo aprende pouco')
      .replace(/\bhiperpar[aâ]metros?\b/gi, 'ajustes do modelo')
      .replace(/\bclassifica\b/gi, 'separa em grupos')
      .replace(/\bpredi[cç][aã]o\b/gi, 'palpite do modelo');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modeloSelecionado'] && this.modeloSelecionado && !this.tutorItemInfo) {
      this.buildModeloContexto();
    }
    if (changes['metricaSelecionada'] && this.metricaSelecionada && !this.tutorItemInfo && !this.contexto?.modelo) {
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
