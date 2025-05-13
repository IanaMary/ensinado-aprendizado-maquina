export interface ItemPipeline {
  icon: string;
  label: string;
  movido: boolean;
  tipoItem: 'coleta-dado' | 'pre-processamento' | 'treino-validacao-teste';
}