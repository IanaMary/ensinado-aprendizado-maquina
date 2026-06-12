import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DashboardService } from '../../../services/dashboard.service';
import { ScriptGeneratorService } from '../../../../service/script-generator.service';
import { ItemPipeline, MediaMetrica, nomeMetricas, ResultadoColetaDado } from '../../../../models/item-coleta-dado.model';

@Component({
  selector: 'app-metrica-avaliacao',
  templateUrl: './metrica-avaliacao.component.html',
  styleUrls: ['./metrica-avaliacao.component.scss'],
  standalone: false
})
export class MetricaAvaliacaoComponent implements OnChanges, OnInit {

  @Input() resultadoTreinamento: any;
  @Input() resultadosDasAvaliacoes: any = {};
  @Input() metricasSelecionadas: ItemPipeline[] = [];
  @Input() resultadoColetaDado: ResultadoColetaDado | undefined;
  @Input() modeloSelecionado: ItemPipeline | undefined;
  @Input() hiperparametros: any = {};
  @Input() preProcessamentoConfig: any = null;
  @Input() mediaMetricas: MediaMetrica = 'weighted';

  @Output() atualizarResultadoAvaliacoes = new EventEmitter<any>();

  itensMetricas: ItemPipeline[] = [];
  modelosAvaliados: string[] = [];
  metricsAvaliadas: string[] = [];
  visualizacoesYellowbrick: Record<string, { titulo: string; mime: string; base64: string }[]> = {};
  visualizacaoAmpliada: { titulo: string; mime: string; base64: string; modelo: string } | null = null;
  dicaVisualizacao: { titulo: string; modelo: string; descricao: string } | null = null;

  tooltipInfo: { linha: number; coluna: number; valor: number; tipo: string; classeReal: string; classePredita: string } | null = null;

  private mapaLabel = new Map<string, string>();

  constructor(
    private dashboardService: DashboardService,
    private scriptGenerator: ScriptGeneratorService,
    private snackBar: MatSnackBar
  ) { }
  cont = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resultadosDasAvaliacoes']) {
      this.atualizarVariaveis();
    }
  }

  ngOnInit(): void {
    this.atualizarVariaveis();
  }


  async postAvaliacao() {
    if (!this.resultadoTreinamento || Object.keys(this.resultadoTreinamento).length === 0) {
      console.warn('[WARN] Tentativa de avaliar sem modelos treinados.');
      this.snackBar.open('Nenhum modelo treinado encontrado. Volte para a etapa de Treinamento.', 'Fechar', { duration: 5000 });
      return;
    }

    const body = {
      modelos: Object.values(this.resultadoTreinamento).map((e: any) => ({ id: e.id, label: e.nome_modelo })),
      metricas: this.metricasSelecionadas.map((e: any) => ({
        valor: e.valor,
        label: e.label,
        average: e.average ?? this.mediaMetricas
      }))
    };

    console.log('[DEBUG] Enviando para avaliar_modelos:', body);
    console.log('[DEBUG] resultadoTreinamento atual:', this.resultadoTreinamento);

    this.dashboardService.postMetricas(body).subscribe({
      next: (res) => {
        console.log('[DEBUG] Resposta de avaliar_modelos:', res);
        this.resultadosDasAvaliacoes = res;
        this.atualizarVariaveis()
        this.atualizarResultadoAvaliacoes.emit(this.resultadosDasAvaliacoes);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  atualizarVariaveis() {
    this.visualizacoesYellowbrick = this.resultadosDasAvaliacoes?._visualizacoes || {};
    this.metricsAvaliadas = Object.keys(this.resultadosDasAvaliacoes || {})
      .filter(chave => chave !== '_visualizacoes');
    this.modelosAvaliados = this.metricsAvaliadas.length > 0
      ? Object.keys(this.resultadosDasAvaliacoes[this.metricsAvaliadas[0]])
      : [];
  }

  getModelosComVisualizacoes(): string[] {
    return Object.keys(this.visualizacoesYellowbrick)
      .filter(modelo => (this.visualizacoesYellowbrick[modelo] || []).length > 0);
  }

  getImagemVisualizacao(visualizacao: { mime: string; base64: string }): string {
    return `data:${visualizacao.mime};base64,${visualizacao.base64}`;
  }

  abrirZoomVisualizacao(visualizacao: { titulo: string; mime: string; base64: string }, modelo: string): void {
    this.visualizacaoAmpliada = { ...visualizacao, modelo };
  }

  fecharZoomVisualizacao(): void {
    this.visualizacaoAmpliada = null;
  }

  abrirDicaVisualizacao(event: Event, visualizacao: { titulo: string }, modelo: string): void {
    event.stopPropagation();
    this.dicaVisualizacao = {
      titulo: visualizacao.titulo,
      modelo,
      descricao: this.getDescricaoVisualizacao(visualizacao.titulo)
    };
  }

  fecharDicaVisualizacao(): void {
    this.dicaVisualizacao = null;
  }

  getDescricaoVisualizacao(titulo: string): string {
    const chave = titulo.toLowerCase();

    if (chave.includes('matriz de confusão')) {
      return 'Mostra quantas respostas o modelo acertou e onde ele confundiu as classes. A diagonal principal indica acertos. Os valores fora da diagonal mostram erros, ou seja, exemplos de uma classe real que foram previstos como outra classe.';
    }

    if (chave.includes('relatório de classificação')) {
      return 'Resume precision, recall, F1-score e suporte por classe. Use para comparar se o modelo trata todas as classes bem ou se ele está indo melhor em algumas classes do que em outras.';
    }

    if (chave.includes('erros de predição')) {
      return 'Mostra, para cada classe real, como as previsões se distribuíram. É útil para descobrir quais classes são mais confundidas pelo modelo e discutir possíveis causas nos atributos do dataset.';
    }

    if (chave.includes('balanceamento')) {
      return 'Mostra a quantidade de exemplos em cada classe. Quando uma classe tem muito mais exemplos do que outra, o modelo pode aprender a favorecer a classe maior.';
    }

    return 'Visualização de avaliação do Yellowbrick. Observe padrões, diferenças entre classes e sinais de erro para discutir o comportamento do modelo.';
  }

  isNumber(value: any): boolean {
    return typeof value === 'number';
  }

  isConfusionMatrix(value: any): boolean {
    return value && typeof value === 'object' && ('matriz' in value || Array.isArray(value)) && 'classes' in value;
  }

  getClasseLabel(value: any, idx: number): string {
    if (this.isConfusionMatrix(value)) {
      return value.classes[idx] || `Classe ${idx}`;
    }
    return `Classe ${idx}`;
  }

  getCellColor(valor: number, max: number, isDiagonal: boolean): string {
    if (max === 0 || valor === 0) return '#f5f5f5';
    const intensidade = Math.min(valor / max, 1);
    
    if (isDiagonal) {
      // Verde para acertos (diagonal principal)
      if (intensidade < 0.3) return '#c8e6c9';
      if (intensidade < 0.6) return '#81c784';
      if (intensidade < 0.8) return '#4caf50';
      return '#2e7d32';
    } else {
      // Vermelho para erros (fora da diagonal)
      if (intensidade < 0.1) return '#ffebee';
      if (intensidade < 0.3) return '#ef9a9a';
      if (intensidade < 0.6) return '#e57373';
      return '#c62828';
    }
  }

  getCellTextColor(valor: number, max: number, isDiagonal: boolean): string {
    if (max === 0 || valor === 0) return '#666';
    const intensidade = Math.min(valor / max, 1);
    if (isDiagonal) {
      return intensidade > 0.4 ? '#fff' : '#2e7d32';
    }
    return intensidade > 0.3 ? '#fff' : '#c62828';
  }

  getCellType(linha: number, coluna: number, total: number): string {
    if (linha === coluna) return 'VP';
    return 'Erro';
  }

  getCellTypeDetailed(linha: number, coluna: number, classes: string[]): string {
    if (linha === coluna) {
      return `VP (${classes[linha]})`;
    }
    return `Erro`;
  }

  getTotalErros(matriz: number[][]): number {
    let erros = 0;
    for (let i = 0; i < matriz.length; i++) {
      for (let j = 0; j < matriz[i].length; j++) {
        if (i !== j) erros += matriz[i][j];
      }
    }
    return erros;
  }

  getAcuracia(matriz: number[][]): number {
    let corretos = 0;
    let total = 0;
    for (let i = 0; i < matriz.length; i++) {
      for (let j = 0; j < matriz[i].length; j++) {
        total += matriz[i][j];
        if (i === j) corretos += matriz[i][j];
      }
    }
    return total > 0 ? corretos / total : 0;
  }

  onCellHover(linha: number, coluna: number, valor: number, classes: string[]) {
    const tipo = linha === coluna ? 'Verdadeiro Positivo (VP)' : 'Erro de Classificação';
    this.tooltipInfo = {
      linha,
      coluna,
      valor,
      tipo,
      classeReal: classes[linha],
      classePredita: classes[coluna]
    };
  }

  onCellLeave() {
    this.tooltipInfo = null;
  }

  getCellTooltip(linha: number, coluna: number, valor: number, classes: string[]): string {
    const classeReal = classes[linha];
    const classePredita = classes[coluna];
    if (linha === coluna) {
      return `VP: ${valor} amostras de "${classeReal}" classificadas corretamente`;
    }
    return `Erro: ${valor} amostras de "${classeReal}" classificadas como "${classePredita}"`;
  }

  async baixarScript(): Promise<void> {
    console.log('baixarScript - preProcessamentoConfig:', this.preProcessamentoConfig);
    console.log('baixarScript - resultadoColetaDado:', this.resultadoColetaDado);
    console.log('baixarScript - modeloSelecionado:', this.modeloSelecionado);
    console.log('baixarScript - metricasSelecionadas:', this.metricasSelecionadas);
    console.log('baixarScript - hiperparametros:', this.hiperparametros);
    
    await this.scriptGenerator.generatePipelineBundle(
      this.resultadoColetaDado,
      this.modeloSelecionado,
      this.metricasSelecionadas,
      this.hiperparametros,
      this.preProcessamentoConfig
    );
  }

  gerarRelatorioAluno(): string {
    const dataset = this.resultadoColetaDado?.nomeDataset || this.resultadoColetaDado?.treino?.nomeArquivo || 'Dataset';
    const pergunta = (this.resultadoColetaDado as any)?.missao?.pergunta || 'Que padrão o modelo conseguiu aprender com os dados?';
    const modelo = this.modeloSelecionado?.label || 'Modelo treinado';
    const linhasMetricas = this.metricsAvaliadas
      .filter(metrica => !this.isConfusionMatrix(this.resultadosDasAvaliacoes[metrica]?.[this.modelosAvaliados[0]]))
      .map(metrica => {
        const valores = this.modelosAvaliados
          .map(modeloNome => `${modeloNome}: ${this.resultadosDasAvaliacoes[metrica]?.[modeloNome]}`)
          .join('; ');
        return `- ${metrica}: ${valores}`;
      });

    return [
      '# Relatório do experimento',
      '',
      `## Pergunta`,
      pergunta,
      '',
      `## Dados`,
      `Dataset usado: ${dataset}`,
      '',
      `## Modelo`,
      `Modelo escolhido: ${modelo}`,
      '',
      `## Resultados`,
      ...(linhasMetricas.length ? linhasMetricas : ['- Gere as avaliações para preencher esta seção.']),
      '',
      `## O que observar`,
      '- O modelo acertou bem todas as classes ou errou mais em alguma?',
      '- Alguma pista dos dados parece ter ajudado mais?',
      '- O que você mudaria para tentar melhorar o resultado?',
      '',
    ].join('\n');
  }

  baixarRelatorioAluno(): void {
    const blob = new Blob([this.gerarRelatorioAluno()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-experimento-ml.md';
    link.click();
    URL.revokeObjectURL(url);
  }
}
