// Tipos e constantes
export type TipoItem = 'coleta-dado' | 'pre-processamento' | 'treino-validacao-teste' | 'metrica';
export type TipoTarget = 'Número' | 'Texto' | 'Booleano' | null;
export type TipoDado = 'Texto' | 'Número' | 'Booleano';
export type MediaMetrica = 'micro' | 'macro' | 'weighted';
export type TipoArquivoDados = 'csv' | 'tsv' | 'json' | 'excel' | 'xlxs';


export const nomeMetricas: Record<string, string> = {
  accuracy_score: 'Acurácia',
  precision_score: 'Precisão',
  recall_score: 'Recall',
  f1_score: 'F1-Score',
  confusion_matrix: 'Matriz de Confusão',
  silhouette_score: 'Silhouette Score',
  calinski_harabasz_score: 'Calinski-Harabasz',
  davies_bouldin_score: 'Davies-Bouldin',
  r2_score: 'R² (Coef. de Determinação)',
  mean_squared_error: 'Erro Quadrático Médio (MSE)',
  root_mean_squared_error: 'Raiz do Erro Quadrático (RMSE)',
  mean_absolute_error: 'Erro Absoluto Médio (MAE)',
};

export const nomeModelos: Record<string, string> = {
  knn: 'k-NN',
  arvore_decisao: 'Árvore de Decisão',
  svm: 'SVM',
  regressao_logistica: 'Regressão Logística',
  regressao_linear: 'Regressão Linear',
  k_means: 'K-Means',
};

export const roleMap: Record<string, string> = {
  'aluno': '/view-aluno',
  'professor': '/view-professor',
  'admin': '/view-admin'
};


export const labelParaTipoTargetMap: Record<string, TipoTarget> = {
  'Número': 'Número',
  'Texto': 'Texto',
  'Booleano': 'Booleano'
};

export const tipoLabels: Record<string, string> = {
  Número: 'Número',
  Texto: 'Texto',
  Booleano: 'Booleano'
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
  preverCategoria: boolean,
  dadosRotulados: boolean
  valor: string;
  id: string;
  resumo?: string;
  tipo?: TipoTarget;
  grupo?: string;
  explicacao?: string;
  hiperparametros?: any[];
  metricas?: any[];
  average?: MediaMetrica;
}

export interface ResultadoColetaDado {
  target: string;
  preverCategoria: boolean,
  dadosRotulados: boolean,
  colunas: string[];
  colunasDetalhes: [];
  porcentagemTreino: number;
  embaralharDados?: boolean;
  estratificarDados?: boolean;
  tipoTarget: TipoTarget;
  atributos: Record<string, boolean>;
  tipos: Record<string, TipoDado>;
  treino: InformacoesDados;
  teste: InformacoesDados;
  fonteDados?: 'arquivo' | 'dataset';
  nomeDataset?: string;
  datasetId?: string;
}

export interface InformacoesDados {
  dados: unknown[];
  totalDados: number;
  erro?: string;
  nomeArquivo?: string;
  tipoItem?: TipoItem;
}


export interface BodyTutor {
  tamanho_arq: number;
  prever_categoria?: boolean;
  prever_quantidade?: boolean;
  dados_rotulados?: boolean;
  num_categorias_conhecidas?: boolean;
  apenas_olhando?: boolean;
}


export function formatarValor(valor: unknown): string {
  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não';
  }
  return String(valor ?? '');
}

