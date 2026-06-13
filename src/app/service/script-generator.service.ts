import { Injectable } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado } from '../models/item-coleta-dado.model';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class ScriptGeneratorService {

  async generatePipelineBundle(
    resultadoColetaDado: ResultadoColetaDado | undefined,
    modeloSelecionado: ItemPipeline | undefined,
    metricasSelecionadas: ItemPipeline[],
    hiperparametros: any,
    preProcessamentoConfig?: any
  ): Promise<void> {
    const zip = new JSZip();
    const folder = zip.folder('pipeline_iana')!;

    // Generate the Python script
    const script = this.generatePythonScript(
      resultadoColetaDado,
      modeloSelecionado,
      metricasSelecionadas,
      hiperparametros,
      preProcessamentoConfig
    );

    // Add script to the folder
    folder.file('pipeline.py', script);

    // Add datasets if available (apenas para fonte de arquivo; toy datasets usam sklearn)
    if (resultadoColetaDado?.fonteDados !== 'dataset') {
      if (resultadoColetaDado?.treino?.dados && resultadoColetaDado.treino.dados.length > 0) {
        const trainCsv = this.convertToCsv(resultadoColetaDado.treino.dados);
        folder.file('data/treino.csv', trainCsv);
      }

      if (resultadoColetaDado?.teste?.dados && resultadoColetaDado.teste.dados.length > 0) {
        const testCsv = this.convertToCsv(resultadoColetaDado.teste.dados);
        folder.file('data/teste.csv', testCsv);
      }
    }

    // Add README
    const readme = this.generateReadme(modeloSelecionado, resultadoColetaDado);
    folder.file('README.md', readme);

    // Generate and download the ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    const nomeModelo = modeloSelecionado?.label || 'modelo';
    const data = new Date().toISOString().slice(0, 10);
    saveAs(content, `pipeline_${nomeModelo}_${data}.zip`);
  }

  private convertToCsv(dados: any[]): string {
    if (!dados || dados.length === 0) return '';
    
    const headers = Object.keys(dados[0]);
    const rows = dados.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  private generateReadme(modelo: ItemPipeline | undefined, resultado: ResultadoColetaDado | undefined): string {
    const lines: string[] = [];
    lines.push('# Pipeline de Machine Learning - Iana');
    lines.push('');
    lines.push('## Estrutura do Projeto');
    lines.push('');
    lines.push('```');
    lines.push('pipeline_iana/');
    if (resultado?.fonteDados === 'dataset') {
      lines.push('├── pipeline.py          # Script principal do pipeline');
    } else {
      lines.push('├── pipeline.py          # Script principal do pipeline');
      lines.push('├── data/');
      lines.push('│   ├── treino.csv       # Dados de treino');
      lines.push('│   └── teste.csv        # Dados de teste');
    }
    lines.push('└── README.md            # Este arquivo');
    lines.push('```');
    lines.push('');
    lines.push('## Como Executar');
    lines.push('');
    lines.push('1. Certifique-se de ter Python 3.7+ instalado');
    lines.push('2. Instale as dependências:');
    lines.push('   ```bash');
    lines.push('   pip install pandas numpy scikit-learn');
    lines.push('   ```');
    lines.push('3. Execute o pipeline:');
    lines.push('   ```bash');
    lines.push('   python pipeline.py');
    lines.push('   ```');
    lines.push('');

    if (modelo) {
      lines.push('## Modelo Utilizado');
      lines.push('');
      lines.push(`- **Modelo:** ${modelo.label || modelo.valor}`);
      lines.push('');
    }

    if (resultado) {
      lines.push('## Dados');
      lines.push('');
      if (resultado.fonteDados === 'dataset') {
        lines.push(`- **Origem:** Toy dataset '${resultado.nomeDataset}' do scikit-learn (carregado via as_frame=True)`);
      }
      lines.push(`- **Target:** ${resultado.target}`);
      lines.push(`- **Atributos:** ${Object.keys(resultado.atributos || {}).filter(k => resultado.atributos?.[k]).join(', ')}`);
      lines.push(`- **Divisão Treino/Teste:** ${resultado.porcentagemTreino || 70}/${100 - (resultado.porcentagemTreino || 70)}`);
      lines.push(`- **Embaralhar dados:** ${resultado.embaralharDados === false ? 'Não' : 'Sim'}`);
      lines.push(`- **Estratificação:** ${resultado.estratificarDados ? 'Sim' : 'Não'}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('*Gerado automaticamente pelo Iana - Plataforma de Ensino de Machine Learning*');

    return lines.join('\n');
  }

  generatePythonScript(
    resultadoColetaDado: ResultadoColetaDado | undefined,
    modeloSelecionado: ItemPipeline | undefined,
    metricasSelecionadas: ItemPipeline[],
    hiperparametros: any,
    preProcessamentoConfig?: any
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('#!/usr/bin/env python3');
    lines.push('# -*- coding: utf-8 -*-');
    lines.push('"""');
    lines.push('Pipeline de Machine Learning gerado pelo Iana');
    lines.push('Data: ' + new Date().toLocaleDateString('pt-BR'));
    lines.push('"""');
    lines.push('');

    // Imports
    const imports = this.collectImports(modeloSelecionado, metricasSelecionadas, preProcessamentoConfig, resultadoColetaDado);
    lines.push(imports.join('\n'));
    lines.push('');

    // Functions for each pipeline stage
    lines.push(this.generateDataLoadingFunction(resultadoColetaDado));
    lines.push('');
    lines.push(this.generateFeatureSelectionFunction(resultadoColetaDado));
    lines.push('');
    lines.push(this.generatePreprocessingFunction(resultadoColetaDado, preProcessamentoConfig));
    lines.push('');
    lines.push(this.generateModelTrainingFunction(modeloSelecionado, hiperparametros));
    lines.push('');
    lines.push(this.generateEvaluationFunction(metricasSelecionadas));
    lines.push('');

    // Main execution
    lines.push('# ============================================');
    lines.push('# Execução Principal do Pipeline');
    lines.push('# ============================================');
    lines.push('');
    lines.push('if __name__ == "__main__":');
    const isClustering = modeloSelecionado?.dadosRotulados === false;
    if (resultadoColetaDado?.fonteDados === 'dataset' && resultadoColetaDado.nomeDataset) {
      const splitPct = resultadoColetaDado.porcentagemTreino || 70;
      const testPct = 100 - splitPct;
      lines.push('    # 1. Carregar dados (toy dataset do scikit-learn)');
      lines.push('    X, y = carregar_dados()');
      lines.push('');
      if (isClustering) {
        lines.push('    # 2. Selecionar features (sem target para agrupamento)');
        lines.push('    X_train, X_test = selecionar_features(X)');
        lines.push('');
      } else {
        lines.push('    # 2. Selecionar features e target (e dividir em treino/teste)');
        lines.push('    X_train, X_test, y_train, y_test = selecionar_features(X, y)');
        lines.push('');
      }
    } else {
      lines.push('    # 1. Carregar dados');
      lines.push('    train_df, test_df = carregar_dados()');
      lines.push('');
      if (isClustering) {
        lines.push('    # 2. Selecionar features (sem target para agrupamento)');
        lines.push('    X_train, X_test = selecionar_features(train_df, test_df)');
        lines.push('');
      } else {
        lines.push('    # 2. Selecionar features e target');
        lines.push('    X_train, y_train, X_test, y_test = selecionar_features(train_df, test_df)');
        lines.push('');
      }
    }
    lines.push('    # 3. Pré-processamento');
    lines.push('    X_train, X_test = aplicar_preprocessamento(X_train, X_test)');
    lines.push('');
    if (isClustering) {
      lines.push('    # 4. Treinar modelo');
      lines.push('    modelo = treinar_modelo(X_train)');
      lines.push('');
      lines.push('    # 5. Avaliar modelo');
      lines.push('    resultados = avaliar_modelo(modelo, X_test)');
    } else {
      lines.push('    # 4. Treinar modelo');
      lines.push('    modelo = treinar_modelo(X_train, y_train)');
      lines.push('');
      lines.push('    # 5. Avaliar modelo');
      lines.push('    resultados = avaliar_modelo(modelo, X_test, y_test)');
    }
    lines.push('');

    return lines.join('\n');
  }

  private collectImports(
    modelo: ItemPipeline | undefined,
    metricas: ItemPipeline[],
    preProcessamentoConfig?: any,
    resultadoColetaDado?: ResultadoColetaDado
  ): string[] {
    const imports: string[] = [];
    imports.push('import pandas as pd');
    imports.push('import numpy as np');
    imports.push('from sklearn.model_selection import train_test_split');

    // Toy dataset imports (sklearn loaders)
    if (resultadoColetaDado?.fonteDados === 'dataset' && resultadoColetaDado.nomeDataset) {
      const ds = this.getToyDatasetLoader(resultadoColetaDado.datasetId ?? resultadoColetaDado.nomeDataset);
      if (ds) {
        const functionName = ds.importLine.split('(')[0];
        const module = functionName.startsWith('fetch_') ? 'datasets' : 'datasets';
        imports.push(`from sklearn.${module} import ${functionName}`);
      }
    }

    // Preprocessing imports
    if (preProcessamentoConfig?.itens?.length > 0) {
      imports.push('from sklearn.preprocessing import (');
      imports.push('    StandardScaler, MinMaxScaler, RobustScaler, Normalizer,');
      imports.push('    LabelEncoder, OneHotEncoder, OrdinalEncoder,');
      imports.push('    PolynomialFeatures, PowerTransformer');
      imports.push(')');
      imports.push('from sklearn.impute import SimpleImputer');
    }

    // Model import
    if (modelo) {
      imports.push(this.getModelImport(modelo.valor));
    }

    // Metrics imports
    const metricImports: string[] = [];
    for (const metrica of metricas) {
      switch (metrica.valor) {
        case 'accuracy_score':
          if (!metricImports.includes('accuracy_score')) metricImports.push('accuracy_score');
          break;
        case 'precision_score':
          if (!metricImports.includes('precision_score')) metricImports.push('precision_score');
          break;
        case 'recall_score':
          if (!metricImports.includes('recall_score')) metricImports.push('recall_score');
          break;
        case 'f1_score':
          if (!metricImports.includes('f1_score')) metricImports.push('f1_score');
          break;
        case 'confusion_matrix':
          if (!metricImports.includes('confusion_matrix')) metricImports.push('confusion_matrix');
          break;
        case 'silhouette_score':
          if (!metricImports.includes('silhouette_score')) metricImports.push('silhouette_score');
          break;
        case 'calinski_harabasz_score':
          if (!metricImports.includes('calinski_harabasz_score')) metricImports.push('calinski_harabasz_score');
          break;
        case 'davies_bouldin_score':
          if (!metricImports.includes('davies_bouldin_score')) metricImports.push('davies_bouldin_score');
          break;
      }
    }
    if (metricImports.length > 0) {
      imports.push(`from sklearn.metrics import (${metricImports.join(', ')})`);
    }

    return imports;
  }

  private getModelImport(modeloValor: string): string {
    const imports: Record<string, string> = {
      'knn': 'from sklearn.neighbors import KNeighborsClassifier',
      'arvore_decisao': 'from sklearn.tree import DecisionTreeClassifier',
      'svm': 'from sklearn.svm import SVC',
      'svm_linear': 'from sklearn.svm import LinearSVC',
      'regressao_logistica': 'from sklearn.linear_model import LogisticRegression',
      'regressao_linear': 'from sklearn.linear_model import LinearRegression',
      'random_forest': 'from sklearn.ensemble import RandomForestClassifier',
      'adaboost': 'from sklearn.ensemble import AdaBoostClassifier',
      'gradient_boosting': 'from sklearn.ensemble import GradientBoostingClassifier',
      'naive_bayes': 'from sklearn.naive_bayes import GaussianNB',
      'mlp': 'from sklearn.neural_network import MLPClassifier',
      'qda': 'from sklearn.discriminant_analysis import QuadraticDiscriminantAnalysis',
      'lda': 'from sklearn.discriminant_analysis import LinearDiscriminantAnalysis',
      'k_means': 'from sklearn.cluster import KMeans',
      'pca': 'from sklearn.decomposition import PCA'
    };
    return imports[modeloValor] || `# TODO: Import para ${modeloValor}`;
  }

  private generateDataLoadingFunction(resultado?: ResultadoColetaDado): string {
    if (resultado?.fonteDados === 'dataset' && resultado.nomeDataset) {
      const datasetKey = resultado.datasetId ?? resultado.nomeDataset;
      const ds = this.getToyDatasetLoader(datasetKey);
      if (ds) {
        return [
          '# ============================================',
          '# Função: Carregamento dos Dados',
          '# ============================================',
          'def carregar_dados():',
          `    """Carrega o dataset '${resultado.nomeDataset}' do scikit-learn."""`,
          `    dados = ${ds.importLine}`,
          '    X = dados.data',
          '    y = dados.target',
          '    ',
          '    print("Primeiras amostras (X):")',
          '    print(X.head())',
          '    print(f"Shape de X: {X.shape}")',
          '    print(f"Shape de y: {y.shape}")',
          '    ',
          '    return X, y'
        ].join('\n');
      }

      const uciId = this.getUciDatasetId(datasetKey);
      if (uciId !== null) {
        return [
          '# ============================================',
          '# Função: Carregamento dos Dados',
          '# ============================================',
          'def carregar_dados():',
          `    """Carrega o dataset '${resultado.nomeDataset}' do UCI Machine Learning Repository."""`,
          '    from ucimlrepo import fetch_ucirepo',
          '    ',
          `    dados = fetch_ucirepo(id=${uciId})`,
          '    X = dados.data.features',
          '    y = dados.data.targets.squeeze()',
          '    ',
          '    print("Primeiras amostras (X):")',
          '    print(X.head())',
          '    print(f"Shape de X: {X.shape}")',
          '    print(f"Shape de y: {y.shape}")',
          '    ',
          '    return X, y'
        ].join('\n');
      }
    }
    return [
      '# ============================================',
      '# Função: Carregamento dos Dados',
      '# ============================================',
      'def carregar_dados():',
      '    """Carrega os dados de treino e teste dos arquivos CSV."""',
      '    train_df = pd.read_csv("data/treino.csv")',
      '    test_df = pd.read_csv("data/teste.csv")',
      '    ',
      '    print("Dados de treino:")',
      '    print(train_df.head())',
      '    print(f"Shape: {train_df.shape}")',
      '    ',
      '    print("\\nDados de teste:")',
      '    print(test_df.head())',
      '    print(f"Shape: {test_df.shape}")',
      '    ',
      '    return train_df, test_df'
    ].join('\n');
  }

  private getToyDatasetLoader(nome: string): { importLine: string } | null {
    const map: Record<string, { importLine: string }> = {
      'iris': { importLine: 'load_iris(as_frame=True)' },
      'wine': { importLine: 'load_wine(as_frame=True)' },
      'breast_cancer': { importLine: 'load_breast_cancer(as_frame=True)' },
      'digits': { importLine: 'load_digits(as_frame=True)' },
      'diabetes': { importLine: 'load_diabetes(as_frame=True)' },
      'california_housing': { importLine: 'fetch_california_housing(as_frame=True)' },
    };
    return map[nome] ?? null;
  }

  // Espelha o mapa uci_ids do backend (app/routers/toy_datasets.py::_carregar_uci).
  private getUciDatasetId(nome: string): number | null {
    const map: Record<string, number> = {
      'adult': 2,
      'wine_quality': 186,
      'heart_disease': 45,
      'titanic': 597,
      'abalone': 1,
      'housing': 601,
      'car_evaluation': 19,
      'mushroom': 73,
      'wholesale_customers': 292,
      'obesity_levels': 544,
      'online_shoppers': 468,
      'heart_failure': 519,
    };
    return map[nome] ?? null;
  }

  private generateFeatureSelectionFunction(resultado: ResultadoColetaDado | undefined): string {
    if (resultado?.fonteDados === 'dataset' && resultado.nomeDataset) {
      const splitPct = resultado.porcentagemTreino || 70;
      const testPct = 100 - splitPct;
      const shuffle = resultado.embaralharDados === false ? 'False' : 'True';
      const stratify = resultado.estratificarDados && resultado.embaralharDados !== false ? 'y' : 'None';
      return [
        '# ============================================',
        '# Função: Seleção de Features e Target',
        '# ============================================',
        'def selecionar_features(X, y):',
        '    """Divide o dataset em treino e teste, mantendo a coluna target separada."""',
        `    X_train, X_test, y_train, y_test = train_test_split(`,
        `        X, y, test_size=${(testPct / 100).toFixed(2)}, random_state=42,`,
        `        shuffle=${shuffle}, stratify=${stratify}`,
        '    )',
        '    ',
        '    print("\\nDivisão treino/teste:")',
        `    print(f"Treino: {X_train.shape[0]} amostras ({splitPct}%)")`,
        `    print(f"Teste:  {X_test.shape[0]} amostras (${testPct}%)")`,
        '    ',
        '    return X_train, X_test, y_train, y_test'
      ].join('\n');
    }
    if (!resultado?.atributos) {
      return [
        '# ============================================',
        '# Função: Seleção de Features e Target',
        '# ============================================',
        'def selecionar_features(train_df, test_df, target="target"):',
        '    """Separa features e target dos dados."""',
        '    atributos = [col for col in train_df.columns if col != target]',
        '    ',
        '    X_train = train_df[atributos]',
        '    y_train = train_df[target]',
        '    ',
        '    X_test = test_df[atributos]',
        '    y_test = test_df[target]',
        '    ',
        '    return X_train, y_train, X_test, y_test'
      ].join('\n');
    }

    const atributos = Object.keys(resultado.atributos).filter(k => resultado.atributos[k]);
    const target = resultado.target;

    return [
      '# ============================================',
      '# Função: Seleção de Features e Target',
      '# ============================================',
      'def selecionar_features(train_df, test_df):',
      '    """Separa features e target dos dados."""',
      `    atributos = ${JSON.stringify(atributos)}`,
      `    target = "${target}"`,
      '    ',
      '    X_train = train_df[atributos]',
      '    y_train = train_df[target]',
      '    ',
      '    X_test = test_df[atributos]',
      '    y_test = test_df[target]',
      '    ',
      '    return X_train, y_train, X_test, y_test'
    ].join('\n');
  }

  private generatePreprocessingFunction(resultadoColetaDado: ResultadoColetaDado | undefined, preProcessamentoConfig?: any): string {
    const lines: string[] = [];
    lines.push('# ============================================');
    lines.push('# Função: Pré-processamento');
    lines.push('# ============================================');
    lines.push('def aplicar_preprocessamento(X_train, X_test):');
    lines.push('    """Aplica as transformações de pré-processamento nos dados."""');

    if (!preProcessamentoConfig?.itens || preProcessamentoConfig.itens.length === 0) {
      lines.push('    # Nenhum pré-processamento configurado');
      lines.push('    return X_train, X_test');
      return lines.join('\n');
    }

    lines.push('    ');
    lines.push('    # Criar cópias para não modificar os originais');
    lines.push('    X_train = X_train.copy()');
    lines.push('    X_test = X_test.copy()');

    const targetCol = resultadoColetaDado?.target;

    for (const item of preProcessamentoConfig.itens) {
      const colunas = item.colunas || [];
      const colsArray = colunas.length > 0
        ? `[${colunas.map((c: string) => `"${c}"`).join(', ')}]`
        : null;

      lines.push('    ');

      switch (item.valor) {
        case 'standard_scaler':
          lines.push(`    # ${item.label}: Remove média e escala para variância unitária`);
          lines.push('    scaler = StandardScaler()');
          if (colsArray) {
            lines.push(`    X_train${colsArray} = scaler.fit_transform(X_train${colsArray})`);
            lines.push(`    X_test${colsArray} = scaler.transform(X_test${colsArray})`);
          } else {
            lines.push('    X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'minmax_scaler':
          lines.push(`    # ${item.label}: Escala dados para intervalo [0, 1]`);
          lines.push('    scaler = MinMaxScaler()');
          if (colsArray) {
            lines.push(`    X_train${colsArray} = scaler.fit_transform(X_train${colsArray})`);
            lines.push(`    X_test${colsArray} = scaler.transform(X_test${colsArray})`);
          } else {
            lines.push('    X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'robust_scaler':
          lines.push(`    # ${item.label}: Escala usando estatísticas robustas a outliers`);
          lines.push('    scaler = RobustScaler()');
          if (colsArray) {
            lines.push(`    X_train${colsArray} = scaler.fit_transform(X_train${colsArray})`);
            lines.push(`    X_test${colsArray} = scaler.transform(X_test${colsArray})`);
          } else {
            lines.push('    X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'normalizer':
          lines.push(`    # ${item.label}: Normaliza amostras para norma unitária`);
          lines.push('    normalizer = Normalizer(norm="l2")');
          if (colsArray) {
            lines.push(`    X_train${colsArray} = normalizer.fit_transform(X_train${colsArray})`);
            lines.push(`    X_test${colsArray} = normalizer.transform(X_test${colsArray})`);
          } else {
            lines.push('    X_train = pd.DataFrame(normalizer.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(normalizer.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'onehot_encoder':
          lines.push(`    # ${item.label}: Codifica features categóricas como one-hot`);
          if (colunas.length > 0) {
            lines.push(`    X_train = pd.get_dummies(X_train, columns=${JSON.stringify(colunas)})`);
            lines.push(`    X_test = pd.get_dummies(X_test, columns=${JSON.stringify(colunas)})`);
            lines.push('    # Alinhar colunas entre treino e teste');
            lines.push('    X_test = X_test.reindex(columns=X_train.columns, fill_value=0)');
          }
          break;

        case 'ordinal_encoder':
          lines.push(`    # ${item.label}: Codifica features categóricas como inteiros ordinais`);
          lines.push('    encoder = OrdinalEncoder()');
          if (colsArray) {
            lines.push(`    X_train${colsArray} = encoder.fit_transform(X_train${colsArray})`);
            lines.push(`    X_test${colsArray} = encoder.transform(X_test${colsArray})`);
          }
          break;

        case 'label_encoder':
          lines.push(`    # ${item.label}: Codifica rótulos categóricos (target)`);
          lines.push('    le = LabelEncoder()');
          for (const col of colunas) {
            if (col === targetCol) {
              lines.push(`    y_train = le.fit_transform(y_train)`);
              lines.push(`    y_test = le.transform(y_test)`);
            } else {
              lines.push(`    X_train["${col}"] = le.fit_transform(X_train["${col}"])`);
              lines.push(`    X_test["${col}"] = le.transform(X_test["${col}"])`);
            }
          }
          break;

        case 'simple_imputer':
          lines.push(`    # ${item.label}: Preenche valores ausentes com a média`);
          lines.push("    imputer = SimpleImputer(strategy='mean')");
          if (colsArray) {
            lines.push(`    X_train${colsArray} = imputer.fit_transform(X_train${colsArray})`);
            lines.push(`    X_test${colsArray} = imputer.transform(X_test${colsArray})`);
          } else {
            lines.push('    X_train = pd.DataFrame(imputer.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(imputer.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'polynomial_features':
          lines.push(`    # ${item.label}: Gera features polinomiais`);
          lines.push('    poly = PolynomialFeatures(degree=2, include_bias=False)');
          if (colsArray) {
            lines.push(`    X_train_poly = poly.fit_transform(X_train${colsArray})`);
            lines.push(`    X_test_poly = poly.transform(X_test${colsArray})`);
            lines.push(`    poly_cols = poly.get_feature_names_out(${colsArray})`);
            lines.push('    X_train_poly = pd.DataFrame(X_train_poly, columns=poly_cols, index=X_train.index)');
            lines.push('    X_test_poly = pd.DataFrame(X_test_poly, columns=poly_cols, index=X_test.index)');
            lines.push(`    X_train = pd.concat([X_train.drop(columns=${colsArray}), X_train_poly], axis=1)`);
            lines.push(`    X_test = pd.concat([X_test.drop(columns=${colsArray}), X_test_poly], axis=1)`);
          }
          break;

        case 'power_transformer':
          lines.push(`    # ${item.label}: Transformação para dados mais Gaussianos`);
          lines.push('    pt = PowerTransformer(method="yeo-johnson")');
          if (colsArray) {
            lines.push(`    X_train${colsArray} = pt.fit_transform(X_train${colsArray})`);
            lines.push(`    X_test${colsArray} = pt.transform(X_test${colsArray})`);
          } else {
            lines.push('    X_train = pd.DataFrame(pt.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(pt.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        default:
          lines.push(`    # ${item.label}: Transformação não implementada automaticamente`);
      }
    }

    lines.push('    ');
    lines.push('    return X_train, X_test');

    return lines.join('\n');
  }

  private generateModelTrainingFunction(modelo: ItemPipeline | undefined, hiperparametros: any): string {
    const lines: string[] = [];
    lines.push('# ============================================');
    lines.push('# Função: Treinamento do Modelo');
    lines.push('# ============================================');
    const isClustering = modelo?.dadosRotulados === false;
    if (isClustering) {
      lines.push('def treinar_modelo(X_train):');
    } else {
      lines.push('def treinar_modelo(X_train, y_train):');
    }
    lines.push('    """Configura e treina o modelo de machine learning."""');

    if (!modelo) {
      lines.push('    # Configure e treine o modelo');
      lines.push('    modelo = ...  # Defina o modelo aqui');
      if (isClustering) {
        lines.push('    modelo.fit(X_train)');
      } else {
        lines.push('    modelo.fit(X_train, y_train)');
      }
      lines.push('    return modelo');
      return lines.join('\n');
    }

    const modelClass = this.getModelClass(modelo.valor);
    const params = this.formatHyperparameters(hiperparametros);

    lines.push('    ');
    lines.push('    # Configuração do modelo');
    lines.push(`    modelo = ${modelClass}(${params})`);
    lines.push('    ');
    lines.push('    # Treinamento');
    if (isClustering) {
      lines.push('    modelo.fit(X_train)');
    } else {
      lines.push('    modelo.fit(X_train, y_train)');
    }
    lines.push('    ');
    lines.push('    print("Modelo treinado com sucesso!")');
    lines.push('    return modelo');

    return lines.join('\n');
  }

  private generateEvaluationFunction(metricas: ItemPipeline[]): string {
    const isClustering = metricas.some(m =>
      ['silhouette_score', 'calinski_harabasz_score', 'davies_bouldin_score'].includes(m.valor)
    );

    const lines: string[] = [];
    lines.push('# ============================================');
    lines.push('# Função: Avaliação do Modelo');
    lines.push('# ============================================');

    if (isClustering) {
      lines.push('def avaliar_modelo(modelo, X_test):');
      lines.push('    """Avalia o modelo de agrupamento usando métricas internas."""');
      lines.push('    ');
      lines.push('    labels = modelo.predict(X_test)');
      lines.push('    ');
      lines.push('    resultados = {}');
      lines.push('    ');
      lines.push('    print("\\n" + "=" * 50)');
      lines.push('    print("MÉTRICAS DE AVALIAÇÃO (AGRUPAMENTO)")');
      lines.push('    print("=" * 50)');

      for (const metrica of metricas) {
        switch (metrica.valor) {
          case 'silhouette_score':
            lines.push('    ');
            lines.push('    # Silhouette Score');
            lines.push('    sil = silhouette_score(X_test, labels)');
            lines.push('    resultados["silhouette_score"] = sil');
            lines.push('    print(f"Silhouette Score: {sil:.4f}")');
            break;
          case 'calinski_harabasz_score':
            lines.push('    ');
            lines.push('    # Calinski-Harabasz');
            lines.push('    ch = calinski_harabasz_score(X_test, labels)');
            lines.push('    resultados["calinski_harabasz"] = ch');
            lines.push('    print(f"Calinski-Harabasz: {ch:.4f}")');
            break;
          case 'davies_bouldin_score':
            lines.push('    ');
            lines.push('    # Davies-Bouldin');
            lines.push('    db = davies_bouldin_score(X_test, labels)');
            lines.push('    resultados["davies_bouldin"] = db');
            lines.push('    print(f"Davies-Bouldin: {db:.4f}")');
            break;
        }
      }
    } else {
      lines.push('def avaliar_modelo(modelo, X_test, y_test):');
      lines.push('    """Avalia o modelo usando as métricas configuradas."""');
      lines.push('    ');
      lines.push('    y_pred = modelo.predict(X_test)');
      lines.push('    ');
      lines.push('    resultados = {}');
      lines.push('    ');
      lines.push('    print("\\n" + "=" * 50)');
      lines.push('    print("MÉTRICAS DE AVALIAÇÃO")');
      lines.push('    print("=" * 50)');

      for (const metrica of metricas) {
        const average = metrica.average || 'weighted';
        switch (metrica.valor) {
          case 'accuracy_score':
            lines.push('    ');
            lines.push('    # Acurácia');
            lines.push('    acuracia = accuracy_score(y_test, y_pred)');
            lines.push('    resultados["acuracia"] = acuracia');
            lines.push('    print(f"Acurácia: {acuracia:.4f}")');
            break;
          case 'f1_score':
            lines.push('    ');
            lines.push(`    # F1-Score (${average})`);
            lines.push(`    f1 = f1_score(y_test, y_pred, average="${average}", zero_division=0)`);
            lines.push('    resultados["f1_score"] = f1');
            lines.push('    print(f"F1-Score: {f1:.4f}")');
            break;
          case 'confusion_matrix':
            lines.push('    ');
            lines.push('    # Matriz de Confusão');
            lines.push('    matriz = confusion_matrix(y_test, y_pred)');
            lines.push('    resultados["matriz_confusao"] = matriz');
            lines.push('    print("\\nMatriz de Confusão:")');
            lines.push('    print(matriz)');
            break;
          case 'precision_score':
            lines.push('    ');
            lines.push(`    # Precisão (${average})`);
            lines.push(`    precisao = precision_score(y_test, y_pred, average="${average}", zero_division=0)`);
            lines.push('    resultados["precisao"] = precisao');
            lines.push('    print(f"Precisão: {precisao:.4f}")');
            break;
          case 'recall_score':
            lines.push('    ');
            lines.push(`    # Recall (${average})`);
            lines.push(`    recall = recall_score(y_test, y_pred, average="${average}", zero_division=0)`);
            lines.push('    resultados["recall"] = recall');
            lines.push('    print(f"Recall: {recall:.4f}")');
            break;
        }
      }
    }

    lines.push('    ');
    lines.push('    return resultados');

    return lines.join('\n');
  }

  private getModelClass(modeloValor: string): string {
    const classes: Record<string, string> = {
      'knn': 'KNeighborsClassifier',
      'arvore_decisao': 'DecisionTreeClassifier',
      'svm': 'SVC',
      'svm_linear': 'LinearSVC',
      'regressao_logistica': 'LogisticRegression',
      'regressao_linear': 'LinearRegression',
      'random_forest': 'RandomForestClassifier',
      'adaboost': 'AdaBoostClassifier',
      'gradient_boosting': 'GradientBoostingClassifier',
      'naive_bayes': 'GaussianNB',
      'mlp': 'MLPClassifier',
      'qda': 'QuadraticDiscriminantAnalysis',
      'lda': 'LinearDiscriminantAnalysis',
      'k_means': 'KMeans',
      'pca': 'PCA'
    };
    return classes[modeloValor] || 'Modelo';
  }

  private formatHyperparameters(hiperparametros: any): string {
    if (!hiperparametros || Object.keys(hiperparametros).length === 0) {
      return '';
    }

    const params: string[] = [];
    for (const [key, value] of Object.entries(hiperparametros)) {
      if (value === null || value === undefined) continue;
      if (typeof value === 'string') {
        params.push(`${key}="${value}"`);
      } else {
        params.push(`${key}=${value}`);
      }
    }

    return params.join(', ');
  }

  downloadScript(script: string, filename: string): void {
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
