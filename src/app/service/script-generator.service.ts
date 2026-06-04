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
    const folderName = 'pipeline_iana';
    const folder = zip.folder(folderName)!;

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

    // Add datasets if available
    if (resultadoColetaDado?.treino?.dados && resultadoColetaDado.treino.dados.length > 0) {
      const trainCsv = this.convertToCsv(resultadoColetaDado.treino.dados);
      folder.file('data/treino.csv', trainCsv);
    }

    if (resultadoColetaDado?.teste?.dados && resultadoColetaDado.teste.dados.length > 0) {
      const testCsv = this.convertToCsv(resultadoColetaDado.teste.dados);
      folder.file('data/teste.csv', testCsv);
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
        // Escape commas and quotes in CSV
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
    lines.push('├── pipeline.py          # Script principal do pipeline');
    lines.push('├── data/');
    lines.push('│   ├── treino.csv       # Dados de treino');
    lines.push('│   └── teste.csv        # Dados de teste');
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
      lines.push(`- **Target:** ${resultado.target}`);
      lines.push(`- **Atributos:** ${Object.keys(resultado.atributos || {}).filter(k => resultado.atributos?.[k]).join(', ')}`);
      lines.push(`- **Divisão Treino/Teste:** ${resultado.porcentagemTreino || 70}/${100 - (resultado.porcentagemTreino || 70)}`);
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

    // Collect all imports needed
    const imports = this.collectImports(modeloSelecionado, metricasSelecionadas, preProcessamentoConfig);
    lines.push(imports.join('\n'));
    lines.push('');

    // Data loading
    lines.push('# ============================================');
    lines.push('# 1. Carregamento dos Dados');
    lines.push('# ============================================');
    lines.push('');
    lines.push(this.getDataLoading(resultadoColetaDado));
    lines.push('');

    // Feature selection
    lines.push('# ============================================');
    lines.push('# 2. Seleção de Atributos e Target');
    lines.push('# ============================================');
    lines.push('');
    lines.push(this.getFeatureSelection(resultadoColetaDado));
    lines.push('');

    // Train/test split
    lines.push('# ============================================');
    lines.push('# 3. Divisão Treino/Teste');
    lines.push('# ============================================');
    lines.push('');
    lines.push(this.getTrainTestSplit(resultadoColetaDado));
    lines.push('');

    // Preprocessing
    let stepNum = 4;
    if (preProcessamentoConfig?.itens?.length > 0) {
      lines.push('# ============================================');
      lines.push(`# ${stepNum}. Pré-processamento`);
      lines.push('# ============================================');
      lines.push('');
      lines.push(this.getPreprocessingCode(preProcessamentoConfig.itens));
      lines.push('');
      stepNum++;
    }

    // Model training
    lines.push('# ============================================');
    lines.push(`# ${stepNum}. Treinamento do Modelo`);
    lines.push('# ============================================');
    lines.push('');
    lines.push(this.getModelTraining(modeloSelecionado, hiperparametros));
    lines.push('');
    stepNum++;

    // Predictions
    lines.push('# ============================================');
    lines.push(`# ${stepNum}. Previsões`);
    lines.push('# ============================================');
    lines.push('');
    lines.push('y_pred = modelo.predict(X_test)');
    lines.push('');
    stepNum++;

    // Metrics
    if (metricasSelecionadas.length > 0) {
      lines.push('# ============================================');
      lines.push(`# ${stepNum}. Avaliação do Modelo`);
      lines.push('# ============================================');
      lines.push('');
      lines.push(this.getMetricsEvaluation(metricasSelecionadas));
      lines.push('');
    }

    return lines.join('\n');
  }

  private collectImports(
    modelo: ItemPipeline | undefined,
    metricas: ItemPipeline[],
    preProcessamentoConfig?: any
  ): string[] {
    const imports: string[] = [];
    imports.push('import pandas as pd');
    imports.push('import numpy as np');
    imports.push('from sklearn.model_selection import train_test_split');

    // Preprocessing imports
    if (preProcessamentoConfig?.itens?.length > 0) {
      const preprocessingImports = new Set<string>();
      for (const item of preProcessamentoConfig.itens) {
        switch (item.valor) {
          case 'standard_scaler':
          case 'min_max_scaler':
          case 'robust_scaler':
            preprocessingImports.add('StandardScaler, MinMaxScaler, RobustScaler');
            break;
          case 'label_encoder':
          case 'one_hot_encoder':
            preprocessingImports.add('LabelEncoder, OneHotEncoder');
            break;
          case 'simple_imputer':
            preprocessingImports.add('SimpleImputer');
            break;
        }
      }
      for (const imp of preprocessingImports) {
        if (imp.includes('SimpleImputer')) {
          imports.push('from sklearn.impute import SimpleImputer');
        } else if (imp.includes('LabelEncoder')) {
          imports.push('from sklearn.preprocessing import LabelEncoder, OneHotEncoder');
        } else {
          imports.push(`from sklearn.preprocessing import ${imp}`);
        }
      }
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
      'naive_bayes': 'from sklearn.naive_bayes import GaussianNB',
      'mlp': 'from sklearn.neural_network import MLPClassifier',
      'qda': 'from sklearn.discriminant_analysis import QuadraticDiscriminantAnalysis',
      'k_means': 'from sklearn.cluster import KMeans',
      'pca': 'from sklearn.decomposition import PCA'
    };
    return imports[modeloValor] || `# TODO: Import para ${modeloValor}`;
  }

  private getDataLoading(resultado: ResultadoColetaDado | undefined): string {
    return [
      '# Carregamento dos dados de treino e teste',
      'train_df = pd.read_csv("data/treino.csv")',
      'test_df = pd.read_csv("data/teste.csv")',
      '',
      '# Visualizar as primeiras linhas',
      'print("Dados de treino:")',
      'print(train_df.head())',
      'print(f"\\nShape: {train_df.shape}")',
      '',
      'print("\\nDados de teste:")',
      'print(test_df.head())',
      'print(f"\\nShape: {test_df.shape}")'
    ].join('\n');
  }

  private getFeatureSelection(resultado: ResultadoColetaDado | undefined): string {
    if (!resultado?.atributos) {
      return [
        '# Defina os atributos (features) e o target',
        'target = "target"  # Substitua pelo nome da coluna alvo',
        'atributos = [col for col in train_df.columns if col != target]',
        '',
        'X_train = train_df[atributos]',
        'y_train = train_df[target]',
        '',
        'X_test = test_df[atributos]',
        'y_test = test_df[target]'
      ].join('\n');
    }

    const atributos = Object.keys(resultado.atributos).filter(k => resultado.atributos[k]);
    const target = resultado.target;

    return [
      '# Atributos selecionados',
      `atributos = ${JSON.stringify(atributos)}`,
      `target = "${target}"`,
      '',
      '# Separar features e target',
      'X_train = train_df[atributos]',
      'y_train = train_df[target]',
      '',
      'X_test = test_df[atributos]',
      'y_test = test_df[target]'
    ].join('\n');
  }

  private getTrainTestSplit(resultado: ResultadoColetaDado | undefined): string {
    return [
      '# Os dados já estão divididos em treino e teste nos arquivos CSV',
      'print(f"Dados de treino: {X_train.shape[0]} amostras")',
      'print(f"Dados de teste: {X_test.shape[0]} amostras")'
    ].join('\n');
  }

  private getPreprocessingCode(itens: any[]): string {
    const lines: string[] = [];
    
    for (const item of itens) {
      const colunas = item.colunas || [];
      const colsArray = colunas.length > 0 
        ? `[${colunas.map((c: string) => `"${c}"`).join(', ')}]` 
        : null;

      switch (item.valor) {
        case 'standard_scaler':
          lines.push(`# StandardScaler${colunas.length > 0 ? ' nas colunas: ' + colunas.join(', ') : ''}`);
          lines.push('scaler = StandardScaler()');
          if (colsArray) {
            lines.push(`X_train${colsArray} = scaler.fit_transform(X_train${colsArray})`);
            lines.push(`X_test${colsArray} = scaler.transform(X_test${colsArray})`);
          } else {
            lines.push('X_train = scaler.fit_transform(X_train)');
            lines.push('X_test = scaler.transform(X_test)');
          }
          break;

        case 'min_max_scaler':
          lines.push(`# MinMaxScaler${colunas.length > 0 ? ' nas colunas: ' + colunas.join(', ') : ''}`);
          lines.push('scaler = MinMaxScaler()');
          if (colsArray) {
            lines.push(`X_train${colsArray} = scaler.fit_transform(X_train${colsArray})`);
            lines.push(`X_test${colsArray} = scaler.transform(X_test${colsArray})`);
          } else {
            lines.push('X_train = scaler.fit_transform(X_train)');
            lines.push('X_test = scaler.transform(X_test)');
          }
          break;

        case 'robust_scaler':
          lines.push(`# RobustScaler${colunas.length > 0 ? ' nas colunas: ' + colunas.join(', ') : ''}`);
          lines.push('scaler = RobustScaler()');
          if (colsArray) {
            lines.push(`X_train${colsArray} = scaler.fit_transform(X_train${colsArray})`);
            lines.push(`X_test${colsArray} = scaler.transform(X_test${colsArray})`);
          } else {
            lines.push('X_train = scaler.fit_transform(X_train)');
            lines.push('X_test = scaler.transform(X_test)');
          }
          break;

        case 'label_encoder':
          lines.push(`# Label Encoder${colunas.length > 0 ? ' nas colunas: ' + colunas.join(', ') : ''}`);
          lines.push('le = LabelEncoder()');
          for (const col of colunas) {
            lines.push(`X_train["${col}"] = le.fit_transform(X_train["${col}"])`);
            lines.push(`X_test["${col}"] = le.transform(X_test["${col}"])`);
          }
          break;

        case 'one_hot_encoder':
          lines.push(`# One-Hot Encoder${colunas.length > 0 ? ' nas colunas: ' + colunas.join(', ') : ''}`);
          if (colunas.length > 0) {
            lines.push(`X_train = pd.get_dummies(X_train, columns=${JSON.stringify(colunas)})`);
            lines.push(`X_test = pd.get_dummies(X_test, columns=${JSON.stringify(colunas)})`);
          }
          break;

        case 'simple_imputer':
          lines.push(`# Simple Imputer (preencher valores ausentes com a média)${colunas.length > 0 ? ' nas colunas: ' + colunas.join(', ') : ''}`);
          lines.push("imputer = SimpleImputer(strategy='mean')");
          if (colsArray) {
            lines.push(`X_train${colsArray} = imputer.fit_transform(X_train${colsArray})`);
            lines.push(`X_test${colsArray} = imputer.transform(X_test${colsArray})`);
          } else {
            lines.push('X_train = imputer.fit_transform(X_train)');
            lines.push('X_test = imputer.transform(X_test)');
          }
          break;

        default:
          lines.push(`# ${item.label || item.valor} - não implementado automaticamente`);
          break;
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private getModelTraining(modelo: ItemPipeline | undefined, hiperparametros: any): string {
    if (!modelo) {
      return [
        '# Configure e treine o modelo',
        'modelo = ...  # Defina o modelo aqui',
        'modelo.fit(X_train, y_train)'
      ].join('\n');
    }

    const modelClass = this.getModelClass(modelo.valor);
    const params = this.formatHyperparameters(hiperparametros);

    return [
      '# Configuração e treinamento do modelo',
      `modelo = ${modelClass}(${params})`,
      'modelo.fit(X_train, y_train)',
      '',
      'print("Modelo treinado com sucesso!")'
    ].join('\n');
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
      'naive_bayes': 'GaussianNB',
      'mlp': 'MLPClassifier',
      'qda': 'QuadraticDiscriminantAnalysis',
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

  private getMetricsEvaluation(metricas: ItemPipeline[]): string {
    const lines: string[] = [];
    lines.push('print("\\n" + "=" * 50)');
    lines.push('print("MÉTRICAS DE AVALIAÇÃO")');
    lines.push('print("=" * 50)');

    for (const metrica of metricas) {
      switch (metrica.valor) {
        case 'accuracy_score':
          lines.push('');
          lines.push('# Acurácia');
          lines.push('acuracia = accuracy_score(y_test, y_pred)');
          lines.push('print(f"Acurácia: {acuracia:.4f}")');
          break;

        case 'f1_score':
          lines.push('');
          lines.push('# F1-Score');
          lines.push('f1 = f1_score(y_test, y_pred, average="weighted")');
          lines.push('print(f"F1-Score: {f1:.4f}")');
          break;

        case 'confusion_matrix':
          lines.push('');
          lines.push('# Matriz de Confusão');
          lines.push('matriz = confusion_matrix(y_test, y_pred)');
          lines.push('print("\\nMatriz de Confusão:")');
          lines.push('print(matriz)');
          break;

        case 'precision_score':
          lines.push('');
          lines.push('# Precisão');
          lines.push('precisao = precision_score(y_test, y_pred, average="weighted")');
          lines.push('print(f"Precisão: {precisao:.4f}")');
          break;

        case 'recall_score':
          lines.push('');
          lines.push('# Recall');
          lines.push('recall = recall_score(y_test, y_pred, average="weighted")');
          lines.push('print(f"Recall: {recall:.4f}")');
          break;
      }
    }

    return lines.join('\n');
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
