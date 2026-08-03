import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ScriptGeneratorService } from './script-generator.service';
import { ItemPipeline, ResultadoColetaDado } from '../models/item-coleta-dado.model';

describe('ScriptGeneratorService', () => {
  let service: ScriptGeneratorService;

  const resultadoArquivo: ResultadoColetaDado = {
    target: 'fruit_name',
    preverCategoria: true,
    dadosRotulados: true,
    colunas: ['mass', 'width', 'fruit_name'],
    colunasDetalhes: [],
    porcentagemTreino: 80,
    embaralharDados: true,
    estratificarDados: false,
    tipoTarget: 'Texto',
    atributos: { mass: true, width: true, fruit_name: false },
    tipos: {},
    treino: { dados: [], totalDados: 100, nomeArquivo: 'fruits.csv' },
    teste: { dados: [], totalDados: 25, nomeArquivo: '' },
    fonteDados: 'arquivo'
  };

  const modeloKnn: ItemPipeline = {
    label: 'KNN',
    valor: 'knn',
    tipoItem: 'treino-validacao-teste',
    movido: true,
    habilitado: true,
    icon: '',
    id: 'knn-1'
  } as ItemPipeline;

  const metricas: ItemPipeline[] = [
    { label: 'Acurácia', valor: 'accuracy_score' } as ItemPipeline,
    { label: 'F1-Score', valor: 'f1_score', average: 'macro' } as ItemPipeline,
    { label: 'Matriz de Confusão', valor: 'confusion_matrix' } as ItemPipeline,
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScriptGeneratorService);
  });

  it('should include base and model imports', () => {
    const script = service.generatePythonScript(resultadoArquivo, modeloKnn, metricas, {});

    expect(script).toContain('import pandas as pd');
    expect(script).toContain('from sklearn.model_selection import train_test_split');
    expect(script).toContain('from sklearn.neighbors import KNeighborsClassifier');
    expect(script).toContain('from sklearn.metrics import (accuracy_score, f1_score, confusion_matrix)');
  });

  it('should instantiate the model with hyperparameters', () => {
    const script = service.generatePythonScript(resultadoArquivo, modeloKnn, metricas, {
      n_neighbors: 3,
      weights: 'distance',
      ignorado: null
    });

    expect(script).toContain('modelo = KNeighborsClassifier(n_neighbors=3, weights="distance")');
    expect(script).not.toContain('ignorado');
  });

  it('should select only enabled attributes and the configured target', () => {
    const script = service.generatePythonScript(resultadoArquivo, modeloKnn, metricas, {});

    expect(script).toContain('atributos = ["mass","width"]');
    expect(script).toContain('target = "fruit_name"');
  });

  it('should evaluate each selected metric with its average', () => {
    const script = service.generatePythonScript(resultadoArquivo, modeloKnn, metricas, {});

    expect(script).toContain('accuracy_score(y_test, y_pred)');
    expect(script).toContain('f1_score(y_test, y_pred, average="macro", zero_division=0)');
    expect(script).toContain('confusion_matrix(y_test, y_pred)');
  });

  it('should generate train/test split with the configured percentage for toy datasets', () => {
    const resultadoDataset: ResultadoColetaDado = {
      ...resultadoArquivo,
      fonteDados: 'dataset',
      nomeDataset: 'iris',
      porcentagemTreino: 70
    };

    const script = service.generatePythonScript(resultadoDataset, modeloKnn, metricas, {});

    expect(script).toContain('test_size=0.30');
    expect(script).toContain('X_train, X_test, y_train, y_test = selecionar_features(X, y)');
  });

  it('should respect shuffle=false and disable stratify in the generated split', () => {
    const resultadoDataset: ResultadoColetaDado = {
      ...resultadoArquivo,
      fonteDados: 'dataset',
      nomeDataset: 'iris',
      embaralharDados: false,
      estratificarDados: true
    };

    const script = service.generatePythonScript(resultadoDataset, modeloKnn, metricas, {});

    expect(script).toContain('shuffle=False, stratify=None');
  });

  it('should generate a runnable skeleton without a model', () => {
    const script = service.generatePythonScript(resultadoArquivo, undefined, [], {});

    expect(script).toContain('if __name__ == "__main__":');
    expect(script).toContain('modelo = ...  # Defina o modelo aqui');
  });

  // A partir daqui: o script exportado tem de RODAR. Os testes acima checam substrings e por isso
  // conviveram com quatro erros que impediam a execução (medidos rodando o zip baixado).

  const datasetSklearn: ResultadoColetaDado = {
    ...resultadoArquivo,
    fonteDados: 'dataset',
    nomeDataset: 'wine',
    datasetId: 'wine',
    porcentagemTreino: 75,
  };

  /** Nome em camelCase dentro de chaves = interpolação do TypeScript que vazou para a f-string
   *  do Python. Foi assim que `{splitPct}` chegou ao aluno como NameError. */
  const INTERPOLACAO_VAZADA = /\{[a-z]+[A-Z]\w*\}/;

  it('não deixa interpolação do TypeScript vazar para dentro da f-string', () => {
    const script = service.generatePythonScript(datasetSklearn, modeloKnn, metricas, {});

    expect(script).not.toMatch(INTERPOLACAO_VAZADA);
    expect(script).toContain('amostras (75%)');
  });

  it('indexa colunas do DataFrame com colchete duplo no pré-processamento', () => {
    const preProc = { itens: [{ valor: 'standard_scaler', colunas: ['mass', 'width'] }] };

    const script = service.generatePythonScript(datasetSklearn, modeloKnn, metricas, {}, preProc);

    // `X_train["mass", "width"]` é uma chave de tupla para o pandas: KeyError.
    expect(script).toContain('X_train[["mass", "width"]] = scaler.fit_transform(X_train[["mass", "width"]])');
    expect(script).toContain('X_test[["mass", "width"]] = scaler.transform(X_test[["mass", "width"]])');
  });

  it('calcula as métricas de regressão, não só as importa', () => {
    const metricasRegressao: ItemPipeline[] = [
      { label: 'R²', valor: 'r2_score' } as ItemPipeline,
      { label: 'MAE', valor: 'mean_absolute_error' } as ItemPipeline,
      { label: 'MSE', valor: 'mean_squared_error' } as ItemPipeline,
      { label: 'RMSE', valor: 'root_mean_squared_error' } as ItemPipeline,
    ];
    const modeloLinear = { ...modeloKnn, label: 'Regressão Linear', valor: 'regressao_linear' } as ItemPipeline;

    const script = service.generatePythonScript(datasetSklearn, modeloLinear, metricasRegressao, {});

    expect(script).toContain('r2 = r2_score(y_test, y_pred)');
    expect(script).toContain('mae = mean_absolute_error(y_test, y_pred)');
    expect(script).toContain('mse = mean_squared_error(y_test, y_pred)');
    // RMSE pela raiz com numpy: `root_mean_squared_error` só existe no sklearn 1.4+.
    expect(script).toContain('rmse = float(np.sqrt(');
    expect(script).not.toContain('from sklearn.metrics import (r2_score, mean_absolute_error, mean_squared_error, root_mean_squared_error)');
  });

  it('gera selecionar_features sem y quando o modelo é de agrupamento', () => {
    const modeloKmeans = {
      ...modeloKnn, label: 'K-means', valor: 'k_means', dadosRotulados: false,
    } as ItemPipeline;
    const metricasAgrup: ItemPipeline[] = [
      { label: 'Silhouette', valor: 'silhouette_score' } as ItemPipeline,
    ];

    const script = service.generatePythonScript(datasetSklearn, modeloKmeans, metricasAgrup, {});

    // A execução principal chama com um argumento só; a definição tem de casar.
    expect(script).toContain('def selecionar_features(X):');
    expect(script).toContain('X_train, X_test = selecionar_features(X)');
    expect(script).not.toContain('def selecionar_features(X, y):');
  });

  it('reproduz dataset sintético no próprio script, sem depender de CSV', () => {
    const blobs: ResultadoColetaDado = {
      ...resultadoArquivo,
      fonteDados: 'dataset',
      nomeDataset: 'Agrupamentos (blobs) gerados',
      datasetId: 'gen_blobs',
      datasetSeed: 42,
    };
    const modeloKmeans = {
      ...modeloKnn, valor: 'k_means', dadosRotulados: false,
    } as ItemPipeline;

    const script = service.generatePythonScript(blobs, modeloKmeans, [], {});

    expect(script).toContain('make_blobs(n_samples=300, n_features=2, centers=3, random_state=42)');
    // Ler CSV aqui era FileNotFoundError: o zip não anexa CSV para dataset de exemplo.
    expect(script).not.toContain('pd.read_csv("data/treino.csv")');
  });

  it('sem semente do servidor, fixa uma e diz que os números não serão idênticos', () => {
    const blobs: ResultadoColetaDado = {
      ...resultadoArquivo,
      fonteDados: 'dataset', nomeDataset: 'blobs', datasetId: 'gen_blobs', datasetSeed: null,
    };
    const modeloKmeans = { ...modeloKnn, valor: 'k_means', dadosRotulados: false } as ItemPipeline;

    const script = service.generatePythonScript(blobs, modeloKmeans, [], {});

    // `random_state=None` faria o script sortear dados novos a cada execução.
    expect(script).not.toContain('random_state=None');
    expect(script).toContain('random_state=42');
    expect(script).toContain('SEM semente fixa');
  });
});
