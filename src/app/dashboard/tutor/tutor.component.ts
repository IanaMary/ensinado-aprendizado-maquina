import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { NivelTutor, NivelTutorService } from '../../service/nivel-tutor.service';
import { conteudoParaItemInfo } from './conteudo-to-item-info';

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

/** Bloco formal do modo Avançado. */
export interface TutorFundamentos {
  formula?: string;
  otimiza?: string;
  pressupostos?: string[];
  complexidade?: string;
  leitura?: string[];
}

/** Bloco operacional do modo Avançado. */
export interface TutorPratica {
  codigo?: string;
  tuning?: string[];
  armadilhas?: string[];
  diagnostico?: string[];
}

export interface TutorItemInfo {
  titulo: string;
  descricao: string;
  /** Explicação em linguagem simples, exibida apenas no modo Básico. */
  resumo_basico?: string;
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
  exemplo_codigo?: string;
  link_sklearn?: string;
  /** Link para a documentação do Yellowbrick (gráficos e modelos com visualização). */
  link_yellowbrick?: string;
  /** Só no modo Avançado: o que o método é (formal) e como usá-lo sem se enganar. */
  fundamentos?: TutorFundamentos;
  pratica?: TutorPratica;
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
  @Input() tutorTheme = 'default';
  /** Mostra o botão "Voltar ao início" (só a Área de Trabalho tem boas-vindas para voltar). */
  @Input() permitirInicio = false;
  /** O pai limpa o que é dele (item/pipeline) e recarrega o texto de boas-vindas. */
  @Output() voltarInicio = new EventEmitter<void>();

  objectKeys = Object.keys;

  /** Info derivada do item selecionado (modelo/métrica) quando o pai não passa `tutorItemInfo`.
   *
   *  Fonte: o `conteudo` do catálogo, no banco — a MESMA que alimenta o card de item. Antes o
   *  painel montava um `contexto` paralelo a partir de `constants/tutor.json`, e as duas fontes
   *  diziam a mesma coisa com outras palavras: "Como pensar nesse modelo" repetia a Intuição, e
   *  "Como funciona" repetia o "Passo a passo" (apontado pela banca, Imagens 7 e 8). Com uma
   *  fonte só a repetição deixa de ser possível. */
  infoDerivada: TutorItemInfo | null = null;

  /** O que o bloco de item renderiza: o que o pai passou ou, na falta, o derivado do catálogo. */
  get infoExibida(): TutorItemInfo | null {
    return this.tutorItemInfo ?? this.infoDerivada;
  }

  /** True quando o painel mostra a ficha de UM item (o "informativo"); false quando mostra o
   *  texto do tutor (boas-vindas ou a explicação da etapa). Governa a faixa de identificação. */
  get ehInformativo(): boolean {
    return !!this.infoExibida;
  }

  constructor(private nivelTutor: NivelTutorService) { }

  /** Resolve o src de uma mídia: URL direta ou data-URI a partir de base64. */
  midiaSrc(m: TutorMidia): string {
    if (m?.url) return m.url;
    if (m?.base64) {
      return m.base64.startsWith('data:') ? m.base64 : `data:image/png;base64,${m.base64}`;
    }
    return '';
  }
  /** Profundidade escolhida pelo aluno. Preferência de perfil (NivelTutorService), não estado
   *  de tela: vale nos três painéis do tutor e sobrevive ao recarregar. */
  get modoTutor(): NivelTutor {
    return this.nivelTutor.nivel;
  }

  set modoTutor(valor: NivelTutor) {
    this.nivelTutor.definir(valor);
  }

  get themeClass(): string {
    return 'theme-' + this.tutorTheme;
  }

  get modoAvancado(): boolean {
    return this.modoTutor === 'avancado';
  }

  /** Texto do bloco "Em palavras simples", que só aparece quando NÃO há ficha de item.
   *  Não cai mais na `intuicao` do item: era ela que reaparecia logo abaixo, no card Intuição. */
  getExplicacaoBasica(): string {
    const texto = this.contexto?.descricao
      || this.tutorPipelineInfo?.descricao
      || '';

    return this.simplificarTermos(texto);
  }

  getTituloBasico(): string {
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

  /** Volta ao estado inicial do painel. O `contexto` é construído AQUI dentro a partir de
   *  modeloSelecionado/metricaSelecionada, então só este componente pode limpá-lo — o resto
   *  é do pai (que também recarrega as boas-vindas). */
  irParaInicio(): void {
    this.contexto = null;
    // Sem isto o painel não volta: a ficha derivada do item continuaria na tela, porque ela só é
    // recalculada quando `modeloSelecionado` muda — e o pipeline do aluno segue com o modelo lá.
    this.infoDerivada = null;
    this.voltarInicio.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // O modelo tem precedência sobre a métrica, como antes: quem acabou de ser escolhido na raia
    // de treino é o que o aluno está olhando.
    if (changes['modeloSelecionado'] && this.modeloSelecionado) {
      this.infoDerivada = this.derivarInfo(this.modeloSelecionado);
    }
    if (changes['metricaSelecionada'] && this.metricaSelecionada && !this.modeloSelecionado) {
      this.infoDerivada = this.derivarInfo(this.metricaSelecionada);
    }
  }

  /** Item do catálogo → ficha do tutor. Sem `conteudo` não há o que mostrar (nenhum stub: o
   *  catálogo em produção tem `conteudo` nos 24 modelos e nas 12 métricas). */
  private derivarInfo(item: any): TutorItemInfo | null {
    const conteudo = item?.conteudo;
    if (!conteudo) return null;
    return conteudoParaItemInfo(conteudo, item?.label || item?.valor || '');
  }
}
