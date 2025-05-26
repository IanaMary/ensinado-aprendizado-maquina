export interface ItemPipeline {
  icon: string;
  label: string;
  movido: boolean;
  tipoItem: 'coleta-dado' | 'pre-processamento' | 'treino-validacao-teste';
}
export interface ResultadoColetaDado {
  dados: any[];
  colunas: string[];
  tipos: { [key: string]: string };
  atributos: { [key: string]: boolean };
  target: string;
  dadosTeste: any[];
  colunasTeste: string[];
  erroTeste?: string;
  nomeArquivoTreino?: string;
  nomeArquivoTeste?: string;
}

export interface DadosArquivo {
  nomeArquivo: string;
  erro: string;
  dados: any[];       // Pode ser tipado melhor, dependendo da sua estrutura
  colunas: string[];
}

export interface InformacoesDados {
  treino: DadosArquivo;
  teste: DadosArquivo;
}