import { Injectable } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado } from '../models/item-coleta-dado.model';

@Injectable({
  providedIn: 'root'
})
export class ScriptGeneratorService {

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
      lines.push(`#${stepNum}. Pré-processamento`);
      lines.push('# ============================================');
      lines.push('');
      lines.push(this.getPreprocessingCode(preProcessamentoConfig.itens));
      lines.push('');
      stepNum++;
    }

    // Model training
    lines.push('# ============================================');
    lines.push(`#${stepNum}. Treinamento do Modelo`);
    lines.push('# ============================================');
    lines.push('');
    lines.push(this.getModelTraining(modeloSelecionado, hiperparametros));
    lines.push('');
    stepNum++;

    // Predictions
    lines.push('# ============================================');
    lines.push(`#${stepNum}. Previsões`);
    lines.push('# ============================================');
    lines.push('');
    lines.push('y_pred = modelo.predict(X_test)');
    lines.push('');
    stepNum++;

    // Metrics
    if (metricasSelecionadas.length > 0) {
      lines.push('# ============================================');
      lines.push(`#${stepNum}. Avaliação do Modelo`);
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
      for (const item of preProcessamentoConfig.itens) {
        switch (item.valor) {
          case 'standard_scaler':
          case 'min_max_scaler':
          case 'robust_scaler':
            if (!imports.includes('from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler')) {
              imports.push('from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler');
            }
            break;
          case 'label_encoder':
          case 'one_hot_encoder':
            if (!imports.includes('from sklearn.preprocessing import LabelEncoder, OneHotEncoder')) {
              imports.push('from sklearn.preprocessing import LabelEncoder, OneHotEncoder');
            }
            break;
          case 'simple_imputer':
            if (!imports.includes('from sklearn.impute import SimpleImputer')) {
              imports.push('from sklearn.impute import SimpleImputer');
            }
            break;
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
    if (!resultado?.treino?.nomeArquivo) {
      return [
        '# Carregue seus dados aqui',
        'df = pd.read_csv("seu_arquivo.csv")  # Ajuste o caminho do arquivo',
        '',
        '# Visualizar as primeiras linhas',
        'print("Primeiras linhas dos dados:")',
        'print(df.head())',
        '',
        '# Informações sobre os dados',
        'print("\\nInformações dos dados:")',
        'print(df.info())'
      ].join('\n');
    }

    const nomeArquivo = resultado.treino.nomeArquivo;
    const extensao = nomeArquivo.split('.').pop()?.toLowerCase();
    
    if (extensao === 'xlsx' || extensao === 'xls') {
      return [
        '# Carregamento dos dados',
        `df = pd.read_excel("${nomeArquivo}")`,
        '',
        '# Visualizar as primeiras linhas',
        'print("Primeiras linhas dos dados:")',
        'print(df.head())'
      ].join('\n');
    }

    return [
      '# Carregamento dos dados',
      `df = pd.read_csv("${nomeArquivo}")`,
      '',
      '# Visualizar as primeiras linhas',
      'print("Primeiras linhas dos dados:")',
      'print(df.head())'
    ].join('\n');
  }

  private getFeatureSelection(resultado: ResultadoColetaDado | undefined): string {
    if (!resultado?.atributos) {
      return [
        '# Defina os atributos (features) e o target',
        'X = df.drop(columns=["target"])  # Substitua "target" pelo nome da coluna alvo',
        'y = df["target"]'
      ].join('\n');
    }

    const atributos = Object.keys(resultado.atributos).filter(k => resultado.atributos[k]);
    const target = resultado.target;

    return [
      '# Atributos selecionados',
      `atributos = ${JSON.stringify(atributos)}`,
      'X = df[atributos]',
      '',
      '# Target',
      `y = df["${target}"]`
    ].join('\n');
  }

  private getTrainTestSplit(resultado: ResultadoColetaDado | undefined): string {
    const trainPercent = resultado?.porcentagemTreino || 70;
    const testPercent = 100 - trainPercent;

    return [
      `# Divisão ${trainPercent}/${testPercent}`,
      'X_train, X_test, y_train, y_test = train_test_split(',
      '    X, y, test_size=' + (testPercent / 100).toFixed(2) + ', random_state=42',
      ')',
      '',
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
