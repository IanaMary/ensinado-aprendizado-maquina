import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import JSZip from 'jszip';

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

  it('respeita a seleção de atributos também no caminho de dataset', () => {
    const wine: ResultadoColetaDado = {
      ...datasetSklearn,
      colunas: ['alcohol', 'malic_acid', 'ash', 'target'],
      // o aluno desmarcou `ash`
      atributos: { alcohol: true, malic_acid: true, ash: false, target: false },
      target: 'target',
    };

    const script = service.generatePythonScript(wine, modeloKnn, metricas, {});

    // O backend treina com `df[atributos]`; o script usava o dataset inteiro (`X = dados.data`)
    // e por isso media outra coisa. O caminho de upload já filtrava.
    expect(script).toContain('atributos = ["alcohol", "malic_acid"]');
    expect(script).toContain('X = X[atributos]');
    expect(script).not.toContain('"ash"');
  });

  // Divergências backend↔script achadas cruzando os 24 routers de `app/routers/` com os mapas
  // do gerador: o script instanciava outra classe (ou outra configuração) da que treinou.

  it('svm_linear é SVC com kernel linear, como o servidor treina', () => {
    const modelo = { ...modeloKnn, label: 'SVM Linear', valor: 'svm_linear' } as ItemPipeline;

    const script = service.generatePythonScript(datasetSklearn, modelo, metricas, {});

    // `app/routers/svm_linear.py` passa SVC + kernel="linear". LinearSVC é outra formulação e
    // dá outro resultado (medido no Wine: 0.9556 contra 0.9778).
    expect(script).toContain('from sklearn.svm import SVC');
    expect(script).toContain('modelo = SVC(kernel="linear")');
    expect(script).not.toContain('LinearSVC');
  });

  it('reproduz os ajustes que o servidor fixa (max_iter do MLP e da regressão logística)', () => {
    const mlp = { ...modeloKnn, valor: 'mlp' } as ItemPipeline;
    const logistica = { ...modeloKnn, valor: 'regressao_logistica' } as ItemPipeline;

    expect(service.generatePythonScript(datasetSklearn, mlp, metricas, {}))
      .toContain('modelo = MLPClassifier(max_iter=500)');
    expect(service.generatePythonScript(datasetSklearn, logistica, metricas, {}))
      .toContain('modelo = LogisticRegression(max_iter=1000)');
  });

  it('o valor escolhido pelo aluno tem precedência sobre o que o servidor fixa', () => {
    const mlp = { ...modeloKnn, valor: 'mlp' } as ItemPipeline;

    const script = service.generatePythonScript(datasetSklearn, mlp, metricas, { max_iter: 50 });

    expect(script).toContain('modelo = MLPClassifier(max_iter=50)');
    expect(script).not.toContain('max_iter=500');
  });

  it('tira os hiperparâmetros do treino, ficando só nos que o catálogo expõe', () => {
    // A resposta do treino traz o `get_params()` inteiro; o script deve mostrar o que o aluno vê.
    const resultado = {
      nome_modelo: 'k-NN', modelo: 'knn',
      hiperparametros: { n_neighbors: 11, weights: 'distance', leaf_size: 30, algorithm: 'auto' },
      hiperparametros_padrao: { n_neighbors: 5, weights: 'uniform' },
    };

    const hiper = (service as any).hiperparametrosDoTreino(resultado);

    expect(hiper).toEqual({ n_neighbors: 11, weights: 'distance' });
    expect((service as any).hiperparametrosDoTreino(undefined)).toEqual({});
  });

  it('cada ramo do multi-modelo sai com os seus próprios ajustes', () => {
    const treinados = [
      { nome_modelo: 'k-NN', modelo: 'knn',
        hiperparametros: { n_neighbors: 11, leaf_size: 30 },
        hiperparametros_padrao: { n_neighbors: 5 } },
      { nome_modelo: 'Árvore', modelo: 'arvore_decisao',
        hiperparametros: { max_depth: 4, splitter: 'best' },
        hiperparametros_padrao: { max_depth: null } },
    ];

    const script = (service as any).generateMultiModelScript(datasetSklearn, treinados, metricas, undefined);

    // Instanciar tudo no default apagava justamente a diferença que se quer comparar.
    expect(script).toContain('"k-NN": KNeighborsClassifier(n_neighbors=11)');
    expect(script).toContain('"Árvore": DecisionTreeClassifier(max_depth=4)');
    expect(script).not.toContain('leaf_size');
  });

  it('gera o import de pré-processamento com parênteses no script multi-modelo', () => {
    const treinados = [
      { nome_modelo: 'k-NN', modelo: 'knn' },
      { nome_modelo: 'Árvore', modelo: 'arvore_decisao' },
    ];

    const script = (service as any).generateMultiModelScript(
      datasetSklearn, treinados, metricas,
      { itens: [{ valor: 'standard_scaler', colunas: ['mass'] }] },
    );

    // Sem os parênteses a lista quebrada em duas linhas termina em vírgula solta e o Python
    // recusa o arquivo inteiro: nenhum script de comparação de modelos com pré-processamento
    // chegava a rodar.
    expect(script).toContain('from sklearn.preprocessing import (');
    expect(script).not.toMatch(/import StandardScaler[^\n]*,\n/);
  });

  it('serializa booleano como True/False, não como true/false', () => {
    const script = service.generatePythonScript(datasetSklearn, modeloKnn, metricas, {
      shrinking: true, warm_start: false, n_neighbors: 3, weights: 'distance',
    });

    // `String(true)` é `"true"`, que em Python é NameError. Atingia todo modelo com booleano.
    expect(script).toContain('shrinking=True, warm_start=False, n_neighbors=3, weights="distance"');
    expect(script).not.toMatch(/=(true|false)[,)]/);
  });

  it('dataset do UCI: carrega `data.original` e usa o alvo escolhido na tela', () => {
    const uci: ResultadoColetaDado = {
      ...datasetSklearn, nomeDataset: 'heart_failure', datasetId: 'heart_failure',
      target: 'death_event',
      colunas: ['age', 'serum_sodium', 'death_event'],
      atributos: { age: true, serum_sodium: true, death_event: false },
    };

    const script = service.generatePythonScript(uci, modeloKnn, metricas, {});

    // `data.features` deixa de fora a coluna que o UCI declara como alvo — e a tela, que lista as
    // colunas de `original`, permite marcá-la. Daí `KeyError: "['death_event'] not in index"`.
    expect(script).toContain('df = dados.data.original');
    expect(script).toContain('y = df["death_event"]');
    expect(script).toContain('X = df.drop(columns=["death_event"])');
    expect(script).not.toContain('dados.data.features');
  });

  // O Titanic saiu do UCI: o id 597 que ele usava NÃO é o Titanic, é "Productivity Prediction of
  // Garment Employees" — quem escolhesse "Titanic" recebia dados de fábrica têxtil e um alvo
  // inexistente. Agora vem do OpenML pelo `fetch_openml`, espelhando `OPENML_SPECS` do backend.
  it('Titanic vem do OpenML, com o mesmo recorte de colunas do backend', () => {
    const titanic: ResultadoColetaDado = {
      ...datasetSklearn, nomeDataset: 'Titanic', datasetId: 'titanic',
      target: 'survived',
      colunas: ['pclass', 'sex', 'age', 'fare', 'survived'],
      atributos: { pclass: true, age: true, fare: true, survived: false },
    };

    const script = service.generatePythonScript(titanic, modeloKnn, metricas, {});

    expect(script).toContain('from sklearn.datasets import fetch_openml');
    expect(script).toContain('dados = fetch_openml("titanic", version=1, as_frame=True)');
    // O Titanic entrega as 13 colunas do OpenML (decisão do usuário: `boat`/`body` são vazamento
    // e ficam expostas para ENSINAR). Então o carregador NÃO recorta — quem recorta é a seleção
    // de atributos do aluno, logo abaixo, e é isso que mantém o script fiel à tela.
    expect(script).not.toContain('X = X[[');
    expect(script).toContain('atributos = ["pclass", "age", "fare"]');
    expect(script).toContain('X = X[atributos]');
    // O alvo já vem como rótulo ('0'/'1'): não passa pelo mapa de `target_names`.
    expect(script).toContain('y = dados.target');
    expect(script).not.toContain('dados.target_names');
    // E não é mais tratado como dataset do UCI.
    expect(script).not.toContain('ucimlrepo');
    expect(script).not.toContain('fetch_ucirepo');
  });

  it('alvo dos datasets de classificação do sklearn vem pelo nome da classe', () => {
    const script = service.generatePythonScript(datasetSklearn, modeloKnn, metricas, {});

    // A plataforma troca o inteiro pelo rótulo; sem isso a matriz de confusão do script sai com
    // outros rótulos — e no breast_cancer em outra ordem, ficando transposta.
    expect(script).toContain('y = dados.target.map(dict(enumerate(dados.target_names)))');
  });

  it('regressão não mapeia o alvo para nome de classe', () => {
    const diabetes: ResultadoColetaDado = {
      ...datasetSklearn, nomeDataset: 'diabetes', datasetId: 'diabetes', preverCategoria: false,
    };

    const script = service.generatePythonScript(diabetes, modeloKnn, metricas, {});

    expect(script).toContain('y = dados.target');
    expect(script).not.toContain('target_names');
  });

  it('PCA é avaliado por variância explicada, não por métrica de agrupamento', () => {
    const pca = { ...modeloKnn, label: 'PCA', valor: 'pca', dadosRotulados: false } as ItemPipeline;

    // O catálogo do PCA tem `metricas: []` — é o caso nominal, e era onde o script quebrava.
    const script = service.generatePythonScript(datasetSklearn, pca, [], {});

    expect(script).toContain('def avaliar_modelo(modelo, X_test):');
    expect(script).toContain('X_reduzido = modelo.transform(X_test)');
    expect(script).toContain('explained_variance_ratio_');
    // PCA não tem `predict`: era `AttributeError`.
    expect(script).not.toContain('modelo.predict(X_test)');
  });

  it('comparação não mistura tarefas: leva os modelos da coleta e diz quais ficaram fora', () => {
    const treinados = [
      { nome_modelo: 'k-NN', modelo: 'knn' },
      { nome_modelo: 'K-means', modelo: 'k_means' },
    ];

    // Coleta COM alvo: a comparação é supervisionada.
    const script = (service as any).generateMultiModelScript(datasetSklearn, treinados, metricas, undefined);

    expect(script).toContain('"k-NN": KNeighborsClassifier');
    expect(script).not.toContain('"K-means": KMeans');
    expect(script).toContain('Fora desta comparação');
    // O laço aplicava `fit(X_train)` a todos: `fit() missing 1 required argument: 'y'`.
    expect(script).toContain('modelo.fit(X_train, y_train)');
  });

  // README do bundle: o aluno segue estas instruções à risca.

  it('README: origem sai da mesma decisão do carregamento, não "toy dataset" para tudo', () => {
    const uci: ResultadoColetaDado = {
      ...datasetSklearn, nomeDataset: 'heart_failure', datasetId: 'heart_failure',
      target: 'death_event',
    };

    const readme = (service as any).generateReadme(modeloKnn, uci, undefined, true);

    expect(readme).toContain('UCI Machine Learning Repository');
    expect(readme).not.toContain("do scikit-learn");
    // sem `ucimlrepo` o script quebra em ModuleNotFoundError seguindo o próprio README
    expect(readme).toContain('pip install pandas numpy scikit-learn ucimlrepo');
  });

  it('README: dataset sintético diz que os dados são gerados, e agrupamento não imprime Target', () => {
    const blobs: ResultadoColetaDado = {
      ...datasetSklearn, nomeDataset: 'blobs', datasetId: 'gen_blobs', datasetSeed: 42, target: '',
    };

    const readme = (service as any).generateReadme(modeloKnn, blobs, undefined, false);

    expect(readme).toContain('GERADO pelo próprio script');
    expect(readme).not.toContain('**Target:**');
  });

  it('README: no multi-modelo os caminhos apontam para modelos/<nome>/', () => {
    const treinados = [{ nome_modelo: 'k-NN' }, { nome_modelo: 'Árvore de Decisão' }];

    const readme = (service as any).generateReadme(undefined, datasetSklearn, treinados, true);

    // O zip põe cada modelo em `modelos/<slug>/`; o README mandava rodar na raiz.
    expect(readme).toContain('cd modelos/<nome-do-modelo>');
    expect(readme).toContain('modelos/<nome-do-modelo>/usar_modelo_joblib.py');
  });

  it('README: só anuncia data/ quando o script realmente lê CSV', () => {
    const semCsv = (service as any).generateReadme(modeloKnn, datasetSklearn, undefined, false);
    expect(semCsv).not.toContain('data/');

    const upload: ResultadoColetaDado = {
      ...resultadoArquivo,
      treino: { dados: [{ a: 1 }], totalDados: 1, nomeArquivo: 'f.csv' },
      teste: { dados: [], totalDados: 0, nomeArquivo: '' },
    };
    const comCsv = (service as any).generateReadme(modeloKnn, upload, undefined, false);
    expect(comCsv).toContain('treino.csv');
    // o teste vazio não é anexado ao zip, então não deve ser anunciado
    expect(comCsv).not.toContain('teste.csv');
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

  // `anexarDadosCsv` existe porque há DOIS montadores de zip (o bundle clássico e o `exportar()`
  // da Trilha) e a Trilha não anexava CSV nenhum — o script dela morria em FileNotFoundError.
  it('anexarDadosCsv: com dados do aluno, grava treino e teste na pasta recebida', async () => {
    const upload: ResultadoColetaDado = {
      ...resultadoArquivo,
      treino: { dados: [{ a: 1, b: 2 }], totalDados: 1, nomeArquivo: 'f.csv' },
      teste: { dados: [{ a: 3, b: 4 }], totalDados: 1, nomeArquivo: '' },
    };
    const zip = new JSZip();
    const pasta = zip.folder('knn')!;

    service.anexarDadosCsv(pasta, upload);

    expect(zip.file('knn/data/treino.csv')).toBeTruthy();
    expect(zip.file('knn/data/teste.csv')).toBeTruthy();
    expect(await zip.file('knn/data/treino.csv')!.async('string')).toBe('a,b\n1,2');
  });

  it('anexarDadosCsv: não grava nada quando o script reproduz os dados sozinho', () => {
    const zip = new JSZip();

    service.anexarDadosCsv(zip, datasetSklearn);

    expect(Object.keys(zip.files).length).toBe(0);
  });

  it('anexarDadosCsv: omite o CSV vazio em vez de gravar arquivo sem linhas', () => {
    const semTeste: ResultadoColetaDado = {
      ...resultadoArquivo,
      treino: { dados: [{ a: 1 }], totalDados: 1, nomeArquivo: 'f.csv' },
      teste: { dados: [], totalDados: 0, nomeArquivo: '' },
    };
    const zip = new JSZip();

    service.anexarDadosCsv(zip, semTeste);

    expect(zip.file('data/treino.csv')).toBeTruthy();
    expect(zip.file('data/teste.csv')).toBeNull();
  });
});
