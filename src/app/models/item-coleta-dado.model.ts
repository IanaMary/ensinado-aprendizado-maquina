// Tipos e constantes
export type TipoItem = 'coleta-dado' | 'pre-processamento' | 'treino-validacao-teste' | 'metrica';
export type TipoTarget = 'number' | 'string' | 'boolean' | undefined;
export type TipoDado = 'Texto' | 'Número' | 'Booleano';


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
  valor?: string;
  resumo?: string;
  tipo?: TipoTarget;
  hiperparametros?: any[];
  metricas?: any[];
}

export interface ResultadoColetaDado {
  treino: InformacoesDados;
  teste?: InformacoesDados;
}

export interface InformacoesDados {
  dados: unknown[];
  colunas: string[];
  tipos: Record<string, TipoDado>;           // Corrigido aqui
  atributos: Record<string, boolean>;
  target: string;
  tipoTarget: TipoTarget;
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