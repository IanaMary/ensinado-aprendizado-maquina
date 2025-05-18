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