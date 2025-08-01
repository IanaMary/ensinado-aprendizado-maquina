// Tipos e constantes
export type TipoItem = 'coleta-dado' | 'pre-processamento' | 'treino-validacao-teste' | 'metrica';
export type TipoTarget = 'number' | 'string' | 'boolean' | null;
export type TipoDado = 'Texto' | 'Número' | 'Booleano';


export const nomeMetricas: Record<string, string> = {
  accuracy_score: 'Acurácia',
  precision_score: 'Precisão',
  recall_score: 'Recall',
  f1_score: 'F1-Score',
  confusion_matrix: 'Matriz de Confusão',
};

export const nomeModelos: Record<string, string> = {
  knn: 'k-NN',
  arvore_decisao: 'Árvore de Decisão',
  svm: 'SVM',
  regressao_logistica: 'Regressão Logística',
  regressao_linear: 'Regressão Linear',
};

export const labelParaTipoTargetMap: Record<TipoDado, TipoTarget> = {
  'Número': 'number',
  'Texto': 'string',
  'Booleano': 'boolean'
};

export const tipoLabels: Record<string, string> = {
  number: 'Número',
  string: 'Texto',
  boolean: 'Booleano'
};

export interface Modelo {
  nome: string;
  valor: string;
  resumo: string;
  tipo: TipoTarget;
}

// Interfaces principais
export interface ItemPipeline {
  icon: string;
  label: string;
  movido: boolean;
  tipoItem: TipoItem;
  habilitado: boolean;
  valor: string;
  resumo?: string;
  tipo?: TipoTarget;
  hiperparametros?: any[];
  metricas?: any[];
}

export interface ResultadoColetaDado {
  target: string;
  colunas: string[];
  porcentagemTreino: number;
  tipoTarget: TipoTarget;
  atributos: Record<string, boolean>;
  tipos: Record<string, TipoDado>;
  treino: InformacoesDados;
  teste: InformacoesDados;
}

export interface InformacoesDados {
  dados: unknown[];
  totalDados: number;
  erro?: string;
  nomeArquivo?: string;
  tipoItem?: TipoItem;
}


export function formatarValor(valor: unknown): string {
  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não';
  }
  return String(valor ?? '');
}