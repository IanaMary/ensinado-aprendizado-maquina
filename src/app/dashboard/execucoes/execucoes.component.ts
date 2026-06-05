import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../services/dashboard.service';
import { ItemPipeline, ResultadoColetaDado } from '../../models/item-coleta-dado.model';
import { ModalExecucaoComponent } from './modals/modal-execucao/modal-execucao.component';
import { TutorContexto } from '../tutor/tutor.component';
import { Subject, takeUntil } from 'rxjs';
import tutor from '../../constants/tutor.json';
import { ScriptGeneratorService } from '../../service/script-generator.service';
import { PipelineService, PipelineState } from '../../service/pipeline.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NomearPipelineDialogComponent } from './modals/nomear-pipeline-dialog/nomear-pipeline-dialog.component';


@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit {

  private destroy$ = new Subject<void>();
  private modalAberto = false;
  private tutorRef = tutor;

  tutor: any;
  tutorPipelineInfo: any = null;
  tutorItemInfo: any = null;
  tutorTheme: string = 'default';
  tutorThemeClass: string = 'theme-default';
  paramsTutor = '';
  etapaAtual = '';

  itens: ItemPipeline[] = [];
  colunaColeta: ItemPipeline[] = [];
  colunaPreProcessamento: ItemPipeline[] = [];
  colunaTreino: ItemPipeline[] = [];
  colunaMetrica: ItemPipeline[] = [];

  resultadoColetaDado?: ResultadoColetaDado;
  modeloSelecionado?: ItemPipeline;
  resultadoTreinamento?: any;
  metricasSelecionadas: ItemPipeline[] = [];
  resultadosDasAvaliacoes: any = {};
  preProcessamentoConfig: any = null;

  constructor(
    private dashboardService: DashboardService,
    public dialog: MatDialog,
    private scriptGenerator: ScriptGeneratorService,
    private pipelineService: PipelineService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.getTutor('inicio');
    this.dashboardService.getItemsEmExecucao().subscribe(itens => {
      this.itens = [...itens];
      this.colunaColeta = itens.filter(i => i.tipoItem === 'coleta-dado');
      this.colunaPreProcessamento = itens.filter(i => i.tipoItem === 'pre-processamento');
      this.colunaTreino = itens.filter(i => i.tipoItem === 'treino-validacao-teste');
      this.colunaMetrica = itens.filter(i => i.tipoItem === 'metrica');
      this.metricasSelecionadas = this.colunaMetrica.filter(i => i.movido);
    });
    this.dashboardService.proximaEtapaPipe$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        this.getTutor(event.etapaAtual, event.chaves);
      });

    // Escuta cliques de info do pipeline sidebar
    this.dashboardService.infoItemClicked$
      .pipe(takeUntil(this.destroy$))
      .subscribe((item: ItemPipeline) => {
        this.mostrarInfoItem(item, new Event('click'));
      });

    // Escuta selecao de toy dataset
    this.dashboardService.resultadoDataset$
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultado: any) => {
        if (resultado) {
          this.processarDatasetSelecionado(resultado);
        }
      });

    // Verificar se ha um pipeline para carregar
    this.route.queryParams.subscribe(params => {
      if (params['pipeline']) {
        this.carregarPipeline(params['pipeline']);
      }
    });
  }


  abrirModalExecucao(item: ItemPipeline): void {
    if (this.modalAberto) return;
    this.modalAberto = true;

    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none',
      width: 'auto',
      disableClose: true,
      hasBackdrop: false,
      data: {
        etapa: item.tipoItem === 'metrica' ? 'avaliacao' : item.tipoItem === 'treino-validacao-teste' ? 'treinamento' : item.tipoItem === 'pre-processamento' ? 'pre-processamento' : item.tipoItem,
        tipoArquivoSelecionado: item.tipoItem === 'coleta-dado' ? item.valor : undefined,
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: item.tipoItem === 'treino-validacao-teste' ? item : this.modeloSelecionado,
        resultadoTreinamento: this.resultadoTreinamento,
        metricasSelecionadas: this.metricasSelecionadas,
        resultadosDasAvaliacoes: this.resultadosDasAvaliacoes,
        preProcessamentoConfig: this.preProcessamentoConfig
      }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      this.modalAberto = false;
      if (resultado) {
        console.log('Modal fechado com resultado:', resultado);
        console.log('preProcessamentoConfig:', resultado.preProcessamentoConfig);
        this.resultadoColetaDado = resultado.resultadoColetaDado
        this.modeloSelecionado = resultado.modeloSelecionado
        this.resultadoTreinamento = resultado.resultadoTreinamento;
        this.metricasSelecionadas = resultado.metricasSelecionadas;
        this.resultadosDasAvaliacoes = resultado.resultadosDasAvaliacoes;
        this.preProcessamentoConfig = resultado.preProcessamentoConfig;

        // Processar itens de pre-processamento
        if (resultado.preProcessamentoConfig?.itens) {
          console.log('Processando itens pre-processamento:', resultado.preProcessamentoConfig.itens);
          this.processarItensPreProcessamento(resultado.preProcessamentoConfig.itens);
        }

        this.dashboardService.moverItensEmExecucao();
        this.atualizarTutorContexto();
      }
    });
  }

  mostrarInfoItem(item: ItemPipeline, event: Event): void {
    event.stopPropagation();

    // Define o tema baseado no tipo de item
    if (item.tipoItem === 'coleta-dado') {
      this.tutorTheme = 'coleta';
      this.tutorThemeClass = 'theme-coleta';
    } else if (item.tipoItem === 'pre-processamento') {
      this.tutorTheme = 'coleta';
      this.tutorThemeClass = 'theme-coleta';
    } else if (item.tipoItem === 'treino-validacao-teste') {
      this.tutorTheme = 'treino';
      this.tutorThemeClass = 'theme-treino';
    } else if (item.tipoItem === 'metrica') {
      this.tutorTheme = 'metrica';
      this.tutorThemeClass = 'theme-metrica';
    }

    // Busca informacoes do item
    this.tutorItemInfo = this.getItemInfo(item);
    this.tutorPipelineInfo = null;
  }

  private getItemInfo(item: ItemPipeline): any {
    const tipo = item.tipoItem;
    const valor = item.valor;

    // Info para itens de coleta
    if (tipo === 'coleta-dado') {
      const coletaInfo: any = {
        'xlxs': {
          titulo: 'Arquivo Excel (.xlsx)',
          descricao: 'O formato XLSX e o padrao do Microsoft Excel. Suporta multiplas abas, formatacao de celulas e formulas. Ideal para dados organizados em tabelas com metadados.',
          dicas: [
            'Verifique se os dados estao na primeira aba ou especifique qual usar',
            'Remova linhas de cabecalho extras antes de importar',
            'Colunas devem ter nomes unicos na primeira linha',
            'Valores numericos nao devem conter caracteres especiais'
          ],
          conceitos: [
            { nome: 'Atributos (Features)', desc: 'Colunas de entrada que o modelo usa para aprender' },
            { nome: 'Target', desc: 'Coluna que o modelo deve prever' },
            { nome: 'Tipos de dados', desc: 'Numerico, texto, booleano - o modelo precisa saber o tipo de cada coluna' }
          ]
        },
        'csv': {
          titulo: 'Arquivo CSV (Comma-Separated Values)',
          descricao: 'CSV e um formato simples onde cada linha e um registro e os valores sao separados por virgula (ou ponto-e-virgula). E leve, universal e rapido de processar.',
          dicas: [
            'Verifique o separador utilizado (virgula, ponto-e-virgula, tab)',
            'Encoding comum: UTF-8. Se acentos aparecerem errados, tente Latin-1',
            'Valores com virgula devem estar entre aspas',
            'Linhas vazias no final podem causar erros'
          ],
          conceitos: [
            { nome: 'Separador', desc: 'Caractere que divide as colunas (, ; \\t)' },
            { nome: 'Encoding', desc: 'Como os caracteres especiais sao representados (UTF-8, Latin-1)' },
            { nome: 'Header', desc: 'Primeira linha com os nomes das colunas' }
          ]
        },
        'json': {
          titulo: 'Arquivo JSON (JavaScript Object Notation)',
          descricao: 'JSON e um formato hierarquico usado em APIs e aplicacoes web. Os dados sao organizados em pares chave-valor, permitindo estruturas complexas e aninhadas.',
          dicas: [
            'O arquivo deve conter um array de objetos na raiz',
            'Chaves devem ser consistentes entre todos os objetos',
            'Valores numericos nao devem ter aspas',
            'Arrays aninhados precisam ser "achados" antes de importar'
          ],
          conceitos: [
            { nome: 'Objeto', desc: 'Conjunto de pares chave-valor entre chaves {}' },
            { nome: 'Array', desc: 'Lista de valores entre colchetes []' },
            { nome: 'Aninhamento', desc: 'Objeto dentro de objeto - pode precisar de transformacao' }
          ]
        }
      };
      return coletaInfo[valor] || coletaInfo['csv'];
    }

    // Info para itens de pre-processamento
    if (tipo === 'pre-processamento') {
      const preProcessInfo: any = {
        'standard_scaler': {
          titulo: 'StandardScaler',
          descricao: 'Padroniza features removendo a media e escalando para variancia unitaria. A formula e: Z = (X - media) / desvio_padrao. Resulta em dados com media 0 e desvio padrao 1.',
          dicas: [
            'Use quando os algoritmos sao sensiveis a escala (KNN, SVM, Regressao Logistica)',
            'Nao e adequado para dados com distribuicao muito diferente da normal',
            'Aplica-se coluna a coluna independentemente',
            'Preserva a forma da distribuicao original'
          ],
          conceitos: [
            { nome: 'Media', desc: 'Valor medio de cada feature (subtraido)' },
            { nome: 'Desvio Padrao', desc: 'Medida de dispersao (usado para dividir)' },
            { nome: 'Z-Score', desc: 'Resultado da padronizacao: quantos desvios da media' }
          ]
        },
        'minmax_scaler': {
          titulo: 'MinMaxScaler',
          descricao: 'Escala os dados para um intervalo fixo, padrao [0, 1]. A formula e: X_scaled = (X - X_min) / (X_max - X_min). Util para algoritmos que requerem dados em escala limitada.',
          dicas: [
            'Ideal para redes neurais e algoritmos baseados em distancia',
            'Sensivel a outliers (um outlier extremo comprime os outros dados)',
            'Use quando voce sabe que os dados tem limites definidos',
            'O intervalo pode ser customizado, ex: [-1, 1]'
          ],
          conceitos: [
            { nome: 'Min/Max', desc: 'Valores minimo e maximo de cada feature' },
            { nome: 'Intervalo', desc: 'Faixa de valores do resultado (padrao 0 a 1)' },
            { nome: 'Outliers', desc: 'Valores extremos que podem distorcer a escala' }
          ]
        },
        'robust_scaler': {
          titulo: 'RobustScaler',
          descricao: 'Escala usando estatisticas robustas a outliers: mediana e intervalo interquartil (IQR). A formula e: X_scaled = (X - mediana) / IQR. Menos sensivel a valores extremos que StandardScaler.',
          dicas: [
            'Use quando os dados contem outliers significativos',
            'IQR = Q3 - Q1 (intervalo entre percentis 25 e 75)',
            'Nao garante valores em intervalo fixo como MinMaxScaler',
            'Ideal para dados com caudas pesadas'
          ],
          conceitos: [
            { nome: 'Mediana', desc: 'Valor central dos dados (robusta a outliers)' },
            { nome: 'IQR', desc: 'Intervalo interquartil: Q3 - Q1' },
            { nome: 'Robustez', desc: 'Resistencia ao efeito de valores extremos' }
          ]
        },
        'normalizer': {
          titulo: 'Normalizer',
          descricao: 'Normaliza amostras individualmente para norma unitaria. Cada linha (amostra) e transformada para ter norma L1 ou L2 igual a 1. Diferente dos outros scalers que operam por coluna.',
          dicas: [
            'Use para dados de texto (TF-IDF) ou dados esparsos',
            'Opera por linha, nao por coluna',
            'L1: soma dos valores absolutos = 1 (distribuicao de probabilidade)',
            'L2: raiz da soma dos quadrados = 1 (vetor unitario)'
          ],
          conceitos: [
            { nome: 'Norma L1', desc: 'Soma dos valores absolutos (Manhattan)' },
            { nome: 'Norma L2', desc: 'Raiz da soma dos quadrados (Euclidiana)' },
            { nome: 'Vetor Unitario', desc: 'Vetor com norma igual a 1' }
          ]
        },
        'onehot_encoder': {
          titulo: 'OneHotEncoder',
          descricao: 'Codifica features categoricas como arrays numericos one-hot. Cada categoria vira uma coluna binaria (0 ou 1). Ex: [vermelho, azul, verde] -> [[1,0,0], [0,1,0], [0,0,1]].',
          dicas: [
            'Use para features categoricas nominais (sem ordem)',
            'Cria N colunas para N categorias (pode aumentar dimensionalidade)',
            'Use sparse_output=True para matrizes esparsas',
            'Cuidado com categorias de alta cardinalidade (muitas categorias)'
          ],
          conceitos: [
            { nome: 'One-Hot', desc: 'Representacao binaria: uma coluna ativa por amostra' },
            { nome: 'Dummy Variable Trap', desc: 'Multicolinearidade quando todas as colunas sao incluidas' },
            { nome: 'Sparse Matrix', desc: 'Matriz com maioria dos valores zero' }
          ]
        },
        'ordinal_encoder': {
          titulo: 'OrdinalEncoder',
          descricao: 'Codifica features categoricas como inteiros ordinais. Cada categoria recebe um numero inteiro sequencial. Ex: [baixo, medio, alto] -> [0, 1, 2].',
          dicas: [
            'Use para features categoricas com ordem natural',
            'Assume que ha relacao de ordem entre as categorias',
            'Nao use para categorias sem ordem (use OneHotEncoder)',
            'Os inteiros podem induzir ordem artificial se nao houver'
          ],
          conceitos: [
            { nome: 'Ordinal', desc: 'Categorias com ordem natural (baixo < medio < alto)' },
            { nome: 'Nominal', desc: 'Categorias sem ordem (vermelho, azul, verde)' },
            { nome: 'Label Encoding', desc: 'Atribuir numeros inteiros as categorias' }
          ]
        },
        'label_encoder': {
          titulo: 'LabelEncoder',
          descricao: 'Codifica rótulos de target (variavel alvo) entre 0 e n_classes-1. Ex: [gato, cachorro, gato, passaro] -> [0, 1, 0, 2]. Deve ser usado apenas para o target, nao para features.',
          dicas: [
            'Use APENAS para a variavel target (y), nao para features',
            'Para features, use OrdinalEncoder ou OneHotEncoder',
            'Decodifique previsoes com inverse_transform()',
            'Alfabetico: a primeira classe encontrada recebe 0'
          ],
          conceitos: [
            { nome: 'Target Encoding', desc: 'Codificacao da variavel que queremos prever' },
            { nome: 'Classes', desc: 'Valores unicos do target' },
            { nome: 'Inverse Transform', desc: 'Converter de volta para as labels originais' }
          ]
        },
        'simple_imputer': {
          titulo: 'SimpleImputer',
          descricao: 'Completa valores faltantes (NaN) usando uma estrategia escolhida. Estrategias: media, mediana, moda (mais frequente), ou valor constante.',
          dicas: [
            'E geralmente o primeiro passo no pre-processamento',
            'Use media para dados normais, mediana para dados com outliers',
            'Moda e util para features categoricas',
            'Pode usar valor constante como "missing" para categoricas'
          ],
          conceitos: [
            { nome: 'NaN', desc: 'Not a Number - representa valores faltantes' },
            { nome: 'Estrategia', desc: 'Como preencher: mean, median, most_frequent, constant' },
            { nome: 'Dados Faltantes', desc: 'Valores ausentes que precisam ser tratados' }
          ]
        },
        'polynomial_features': {
          titulo: 'PolynomialFeatures',
          descricao: 'Gera features polinomiais e de interacao. Para grau 2: [a, b] vira [1, a, b, a^2, ab, b^2]. Captura relacoes nao-lineares entre features.',
          dicas: [
            'Use quando suspeita de relacoes nao-lineares entre features',
            'Aumenta significativamente o numero de features',
            'Grau 2 e comum; grau 3+ pode causar overfitting',
            'Combine com Regularizacao (Ridge, Lasso) para controlar overfitting'
          ],
          conceitos: [
            { nome: 'Grau', desc: 'Nivel de combinacao polinomial (2 = quadratico)' },
            { nome: 'Interacao', desc: 'Produto entre features (ab = a * b)' },
            { nome: 'Feature Expansion', desc: 'Aumento do espaco de features' }
          ]
        },
        'power_transformer': {
          titulo: 'PowerTransformer',
          descricao: 'Aplica transformacao de potencia para tornar os dados mais Gaussianos (normais). Metodos: Box-Cox (dados positivos) e Yeo-Johnson (dados com zeros/negativos).',
          dicas: [
            'Use quando os dados tem distribuicao muito assimetrica',
            'Box-Cox so funciona com valores positivos',
            'Yeo-Johnson funciona com qualquer valor real',
            'Melhora performance de algoritmos que assumem normalidade'
          ],
          conceitos: [
            { nome: 'Box-Cox', desc: 'Transformacao: (x^lambda - 1) / lambda para x > 0' },
            { nome: 'Yeo-Johnson', desc: 'Generalizacao do Box-Cox para valores negativos' },
            { nome: 'Gaussianizacao', desc: 'Tornar os dados mais proximos da distribuicao normal' }
          ]
        }
      };
      return preProcessInfo[valor] || {
        titulo: item.label,
        descricao: item.resumo || 'Tecnica de pre-processamento de dados.',
        dicas: ['Configure os parametros conforme necessario']
      };
    }

    // Info para modelos de treinamento
    if (tipo === 'treino-validacao-teste') {
      const modelos = this.tutorRef.modelos as any;
      const modeloInfo = modelos?.[valor];
      if (modeloInfo) {
        return {
          titulo: modeloInfo.nome,
          descricao: modeloInfo.descricao,
          dicas: modeloInfo.quandoUsar?.slice(0, 4) || [],
          conceitos: [
            { nome: 'Tipo', desc: modeloInfo.tipo || 'Classificador' },
            { nome: 'Hiperparametros', desc: Object.keys(modeloInfo.hiperparametros || {}).length + ' configuraveis' },
            { nome: 'Complexidade', desc: modeloInfo.complexidade || 'Variavel' }
          ],
          hiperparametros: modeloInfo.hiperparametros,
          vantagens: modeloInfo.vantagens,
          desvantagens: modeloInfo.desvantagens
        };
      }
      return {
        titulo: item.label,
        descricao: item.resumo || 'Modelo de machine learning para treinamento.',
        dicas: ['Selecione o modelo e configure os hiperparametros', 'Clique em Treinar para iniciar o processo']
      };
    }

    // Info para metricas
    if (tipo === 'metrica') {
      const metricas = this.tutorRef.metricas as any;
      const metricaInfo = metricas?.[valor];
      if (metricaInfo) {
        return {
          titulo: metricaInfo.nome,
          descricao: metricaInfo.descricao,
          dicas: metricaInfo.quandoUsar?.slice(0, 4) || [],
          conceitos: [
            { nome: 'Formula', desc: metricaInfo.formula },
            { nome: 'Intervalo', desc: metricaInfo.intervalo },
            { nome: 'Interpretacao', desc: metricaInfo.interpretacao }
          ],
          formula: metricaInfo.formula,
          intuicao: metricaInfo.intuicao,
          exemplo: metricaInfo.exemploReal
        };
      }
      return {
        titulo: item.label,
        descricao: item.resumo || 'Metrica de avaliacao do modelo.',
        dicas: ['Selecione as metricas para avaliar o modelo']
      };
    }

    return {
      titulo: item.label,
      descricao: 'Clique para executar esta etapa do pipeline.',
      dicas: []
    };
  }

  getTutor(etapa: string, chaves: string[] = []) {
    const params = this.criarBody(etapa, chaves)
    if (params !== this.paramsTutor) {
      this.paramsTutor = params;
      this.etapaAtual = this.etapaAtual;
      this.dashboardService.getTutor(this.paramsTutor).subscribe({
        next: async (res: any) => {
          if (res.descricao) {
            this.tutor = res.descricao.replace(/&nbsp;/g, ' ');
          }
        },
        error: (error: any) => { }
      });
    }
  }

  criarBody(etapa: string, chaves: string[]) {

    const params = new URLSearchParams();
    params.append('pipe', etapa);

    chaves?.forEach(chave => params.append('textos', chave));

    return params.toString();
  }

  limparSessao() {
    sessionStorage.removeItem('idColeta');
    sessionStorage.removeItem('configurcaoTreinamento');
    this.resultadoColetaDado = undefined;
    this.modeloSelecionado = undefined;
    this.resultadoTreinamento = undefined;
    this.metricasSelecionadas = [];
    this.resultadosDasAvaliacoes = {};
    this.tutorPipelineInfo = null;
    this.tutorItemInfo = null;
    this.tutorTheme = 'default';
    this.tutorThemeClass = 'theme-default';
    this.dashboardService.limparItensExecucao();
  }

  async baixarPipeline(): Promise<void> {
    await this.scriptGenerator.generatePipelineBundle(
      this.resultadoColetaDado,
      this.modeloSelecionado,
      this.metricasSelecionadas,
      {},
      this.preProcessamentoConfig
    );
  }

  carregarPipeline(id: string): void {
    this.pipelineService.carregarPipeline(id).subscribe(pipeline => {
      if (pipeline) {
        this.resultadoColetaDado = pipeline.resultadoColetaDado;
        this.modeloSelecionado = pipeline.modeloSelecionado;
        this.metricasSelecionadas = pipeline.metricasSelecionadas || [];
        this.preProcessamentoConfig = pipeline.preProcessamentoConfig;
        this.resultadoTreinamento = pipeline.resultadoTreinamento;
        this.resultadosDasAvaliacoes = pipeline.resultadosDasAvaliacoes;
        this.atualizarTutorContexto();
      }
    });
  }

  salvarPipeline(): void {
    const dialogRef = this.dialog.open<NomearPipelineDialogComponent, any, string | null>(
      NomearPipelineDialogComponent,
      {
        width: '440px',
        disableClose: false,
        autoFocus: 'first-tabbable',
      }
    );

    dialogRef.afterClosed().subscribe(nome => {
      if (!nome) return;

      const state: PipelineState = {
        nome,
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: this.modeloSelecionado,
        metricasSelecionadas: this.metricasSelecionadas,
        preProcessamentoConfig: this.preProcessamentoConfig,
        resultadoTreinamento: this.resultadoTreinamento,
        resultadosDasAvaliacoes: this.resultadosDasAvaliacoes
      };

      this.pipelineService.salvarPipeline(state).subscribe(() => {
        console.log('Pipeline salvo com sucesso:', nome);
      });
    });
  }

  navegarParaProjetos(): void {
    this.router.navigate(['/view-aluno/projetos']);
  }

  navegarParaGaleria(): void {
    this.router.navigate(['/view-aluno/galeria']);
  }

  navegarParaAdmin(): void {
    this.router.navigate(['/view-admin']);
  }

  navegarParaUsuarios(): void {
    this.router.navigate(['/view-admin/usuarios']);
  }

  atualizarTutorContexto(): void {
    if (this.modeloSelecionado) {
      const modelos = this.tutorRef.modelos as any;
      const modeloInfo = modelos?.[this.modeloSelecionado.valor];
      if (modeloInfo) {
        this.tutorPipelineInfo = {
          titulo: modeloInfo.nome,
          descricao: modeloInfo.descricao,
          dicas: modeloInfo.quandoUsar?.slice(0, 3) || []
        };
        this.tutorTheme = 'treino';
        this.tutorThemeClass = 'theme-treino';
      }
    } else if (this.metricasSelecionadas.length > 0) {
      const metricas = this.tutorRef.metricas as any;
      const metricaInfo = metricas?.[this.metricasSelecionadas[0].valor];
      if (metricaInfo) {
        this.tutorPipelineInfo = {
          titulo: metricaInfo.nome,
          descricao: metricaInfo.descricao,
          dicas: metricaInfo.quandoUsar?.slice(0, 3) || []
        };
        this.tutorTheme = 'metrica';
        this.tutorThemeClass = 'theme-metrica';
      }
    } else {
      this.tutorPipelineInfo = null;
      this.tutorTheme = 'default';
      this.tutorThemeClass = 'theme-default';
    }
  }

  processarDatasetSelecionado(resultado: any): void {
    // Atualizar o tutor com informacoes sobre o dataset selecionado
    const datasetNome = resultado.nome_dataset || resultado.nomeDataset || 'Dataset';
    const nAmostras = resultado.n_amostras || resultado.total_dados || 0;
    const nFeatures = resultado.n_features || resultado.colunas?.length || 0;
    const target = resultado.target || '';
    const tipo = resultado.prever_categoria ? 'Classificacao' : 'Regressao';
    const fonte = resultado.fonte || 'sklearn';

    this.tutorItemInfo = {
      titulo: datasetNome,
      descricao: `Dataset de ${tipo.toLowerCase()} com ${nAmostras} amostras e ${nFeatures} features. Fonte: ${fonte}.`,
      dicas: [
        `Target: ${target}`,
        `Tipo: ${tipo}`,
        `Amostras: ${nAmostras}`,
        `Features: ${nFeatures}`
      ]
    };
    this.tutorTheme = 'coleta';
    this.tutorThemeClass = 'theme-coleta';

    // Preparar dados para o modal
    const treino: any = {
      dados: resultado.dados || [],
      totalDados: resultado.total_dados || 0,
      nomeArquivo: datasetNome
    };

    const colunas = resultado.colunas || [];
    const colunasDetalhes = resultado.colunas_detalhes || [];
    const preverCategoria = resultado.prever_categoria || false;
    const dadosRotulados = resultado.dados_rotulados !== false;
    const tipoTarget = resultado.tipo_target || null;

    // Configurar atributos (todos exceto target)
    const att: any = {};
    for (const col of colunas) {
      att[col] = col !== target;
    }

    // Atualizar resultado da coleta
    this.resultadoColetaDado = {
      target: target,
      preverCategoria: preverCategoria,
      dadosRotulados: dadosRotulados,
      colunas: colunas,
      colunasDetalhes: colunasDetalhes,
      porcentagemTreino: 70,
      tipoTarget: tipoTarget,
      atributos: att,
      tipos: {},
      treino: treino,
      teste: { dados: [], totalDados: 0, nomeArquivo: '' }
    };

    // Criar item para a coluna de coleta
    const datasetItem: ItemPipeline = {
      label: datasetNome,
      movido: true,
      tipoItem: 'coleta-dado',
      habilitado: true,
      valor: 'dataset',
      preverCategoria: preverCategoria,
      dadosRotulados: dadosRotulados,
      icon: 'coleta-dado',
      id: 'dataset-' + Date.now()
    };

    // Adicionar item a coluna de coleta
    this.dashboardService.movendoItemExecucao(datasetItem);

    // Abrir modal com dados pre-configurados
    setTimeout(() => {
      this.abrirModalComDataset();
    }, 300);
  }

  abrirModalComDataset(): void {
    if (this.modalAberto) return;
    this.modalAberto = true;

    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none',
      width: 'auto',
      disableClose: true,
      hasBackdrop: false,
      data: {
        etapa: 'coleta-dado',
        tipoArquivoSelecionado: 'csv',
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: this.modeloSelecionado,
        resultadoTreinamento: this.resultadoTreinamento,
        metricasSelecionadas: this.metricasSelecionadas,
        resultadosDasAvaliacoes: this.resultadosDasAvaliacoes
      }
    });

    dialogRef.afterClosed().subscribe((resultado: any) => {
      this.modalAberto = false;
      if (resultado) {
        this.resultadoColetaDado = resultado.resultadoColetaDado;
        this.modeloSelecionado = resultado.modeloSelecionado;
        this.resultadoTreinamento = resultado.resultadoTreinamento;
        this.metricasSelecionadas = resultado.metricasSelecionadas;
        this.resultadosDasAvaliacoes = resultado.resultadosDasAvaliacoes;
        this.dashboardService.moverItensEmExecucao();
        this.atualizarTutorContexto();
      }
    });
  }

  processarItensPreProcessamento(itens: any[]): void {
    console.log('processarItensPreProcessamento chamado com:', itens);
    // Criar itens de pre-processamento para a coluna
    for (const item of itens) {
      const itemPipeline: ItemPipeline = {
        label: item.label,
        movido: true,
        tipoItem: 'pre-processamento',
        habilitado: true,
        preverCategoria: false,
        dadosRotulados: false,
        valor: item.valor,
        icon: 'pre-processamento',
        id: 'preproc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      };
      console.log('Criando item pipeline:', itemPipeline);
      this.dashboardService.movendoItemExecucao(itemPipeline);
    }

    // Atualizar itens de pre-processamento no servico
    const itensAtuais = this.dashboardService.getItensPreProcessamentoSync();
    console.log('Itens atuais pre-processamento:', itensAtuais);
    const novosItens = itens.map(item => ({
      ...item,
      movido: true,
      tipoItem: 'pre-processamento' as const,
      habilitado: true,
      preverCategoria: false,
      dadosRotulados: false,
      icon: 'pre-processamento'
    }));
    console.log('Novos itens pre-processamento:', novosItens);
    this.dashboardService.atualizarItensPreProcessamento([...itensAtuais, ...novosItens]);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
