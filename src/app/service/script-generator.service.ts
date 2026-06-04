import { Injectable } from '@angular/core';
import { ItemPipeline, ResultadoColetaDado } from '../models/item-coleta-dado.model';
import tutor from '../constants/tutor.json';

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
    console.log('generatePythonScript - preProcessamentoConfig:', preProcessamentoConfig);
    console.log('generatePythonScript - preProcessamentoConfig?.itens:', preProcessamentoConfig?.itens);
    
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
    lines.push('# Imports');
    lines.push('import pandas as pd');
    lines.push('import numpy as np');
    lines.push('from sklearn.model_selection import train_test_split');

    // Preprocessing imports
    if (preProcessamentoConfig?.itens?.length > 0) {
      console.log('Adicionando imports de pre-processamento');
      lines.push(this.getPreprocessingImports(preProcessamentoConfig.itens));
    }

    // Model import
    if (modeloSelecionado) {
      lines.push(this.getModelImport(modeloSelecionado.valor));
    }

    // Metrics imports
    if (metricasSelecionadas.length > 0) {
      lines.push(this.getMetricsImports(metricasSelecionadas));
    }

    lines.push('');

    // Data loading
    lines.push('# ============================================');
    lines.push('# 1. Carregamento dos Dados');
    lines.push('# ============================================');
    lines.push('');

    if (resultadoColetaDado) {
      lines.push(this.getDataLoading(resultadoColetaDado));
    } else {
      lines.push('# Carregue seus dados aqui');
      lines.push('df = pd.read_csv("seu_arquivo.csv")  # ou pd.read_excel("seu_arquivo.xlsx")');
      lines.push('');
    }

    // Feature selection
    lines.push('# ============================================');
    lines.push('# 2. Seleção de Atributos e Target');
    lines.push('# ============================================');
    lines.push('');

    if (resultadoColetaDado) {
      lines.push(this.getFeatureSelection(resultadoColetaDado));
    } else {
      lines.push('# Defina os atributos (features) e o target');
      lines.push('X = df.drop(columns=["target"])  # Substitua "target" pelo nome da coluna alvo');
      lines.push('y = df["target"]');
      lines.push('');
    }

    // Train/test split
    lines.push('# ============================================');
    lines.push('# 3. Divisão Treino/Teste');
    lines.push('# ============================================');
    lines.push('');

    const trainPercent = resultadoColetaDado?.porcentagemTreino || 70;
    const testPercent = 100 - trainPercent;
    lines.push(`# Divisão ${trainPercent}/${testPercent}`);
    lines.push(`X_train, X_test, y_train, y_test = train_test_split(`);
    lines.push(`    X, y, test_size=${testPercent / 100}, random_state=42`);
    lines.push(`)`);
    lines.push('');
    lines.push(`print(f"Dados de treino: {X_train.shape[0]} amostras")`);
    lines.push(`print(f"Dados de teste: {X_test.shape[0]} amostras")`);
    lines.push('');

    // Preprocessing
    if (preProcessamentoConfig?.itens?.length > 0) {
      lines.push('# ============================================');
      lines.push('# 4. Pré-processamento');
      lines.push('# ============================================');
      lines.push('');
      lines.push(this.getPreprocessingCode(preProcessamentoConfig.itens));
    }

    // Model training
    const stepNumber = preProcessamentoConfig?.itens?.length > 0 ? '5' : '4';
    lines.push('# ============================================');
    lines.push(`#${stepNumber}. Treinamento do Modelo`);
    lines.push('# ============================================');
    lines.push('');

    if (modeloSelecionado && hiperparametros) {
      lines.push(this.getModelTraining(modeloSelecionado, hiperparametros));
    } else {
      lines.push('# Configure e treine o modelo');
      lines.push('modelo = ...  # Defina o modelo aqui');
      lines.push('modelo.fit(X_train, y_train)');
      lines.push('');
    }

    // Predictions
    lines.push('# ============================================');
    lines.push('# 5. Previsões');
    lines.push('# ============================================');
    lines.push('');
    lines.push('y_pred = modelo.predict(X_test)');
    lines.push('');

    // Metrics
    if (metricasSelecionadas.length > 0) {
      lines.push('# ============================================');
      lines.push('# 6. Avaliação do Modelo');
      lines.push('# ============================================');
      lines.push('');
      lines.push(this.getMetricsEvaluation(metricasSelecionadas));
    }

    // Results summary
    lines.push('# ============================================');
    lines.push('# 7. Resumo dos Resultados');
    lines.push('# ============================================');
    lines.push('');
    lines.push('print("\\n" + "=" * 50)');
    lines.push('print("RESUMO DO PIPELINE")');
    lines.push('print("=" * 50)');
    lines.push(`print(f"Modelo: {type(modelo).__name__}")`);
    lines.push(`print(f"Acurácia: {modelo.score(X_test, y_test):.4f}")`);
    lines.push('print("=" * 50)');

    return lines.join('\n');
  }

  private getModelImport(modeloValor: string): string {
    const imports: Record<string, string> = {
      'knn': 'from sklearn.neighbors import KNeighborsClassifier',
      'arvore_decisao': 'from sklearn.tree import DecisionTreeClassifier',
      'svm': 'from sklearn.svm import SVC',
      'regressao_logistica': 'from sklearn.linear_model import LogisticRegression',
      'regressao_linear': 'from sklearn.linear_model import LinearRegression',
      'k_means': 'from sklearn.cluster import KMeans',
      'pca': 'from sklearn.decomposition import PCA'
    };
    return imports[modeloValor] || `# Import para ${modeloValor}`;
  }

  private getPreprocessingImports(itens: any[]): string {
    const imports: string[] = [];
    for (const item of itens) {
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
        case 'pca':
          if (!imports.includes('from sklearn.decomposition import PCA')) {
            imports.push('from sklearn.decomposition import PCA');
          }
          break;
      }
    }
    return imports.join('\n');
  }

  private getPreprocessingCode(itens: any[]): string {
    const lines: string[] = [];
    for (const item of itens) {
      const cols = item.colunas && item.colunas.length > 0 
        ? item.colunas.map((c: string) => `"${c}"`).join(', ') 
        : 'todas as colunas numéricas';
      
      lines.push(`# ${item.label} nas colunas: ${cols}`);
      switch (item.valor) {
        case 'standard_scaler':
          lines.push(`scaler = StandardScaler()`);
          if (item.colunas && item.colunas.length > 0) {
            lines.push(`X_train[${[item.colunas]}] = scaler.fit_transform(X_train[${[item.colunas]}])`);
            lines.push(`X_test[${[item.colunas]}] = scaler.transform(X_test[${[item.colunas]}])`);
          } else {
            lines.push(`X_train = scaler.fit_transform(X_train)`);
            lines.push(`X_test = scaler.transform(X_test)`);
          }
          break;
        case 'min_max_scaler':
          lines.push(`scaler = MinMaxScaler()`);
          if (item.colunas && item.colunas.length > 0) {
            lines.push(`X_train[${[item.colunas]}] = scaler.fit_transform(X_train[${[item.colunas]}])`);
            lines.push(`X_test[${[item.colunas]}] = scaler.transform(X_test[${[item.colunas]}])`);
          } else {
            lines.push(`X_train = scaler.fit_transform(X_train)`);
            lines.push(`X_test = scaler.transform(X_test)`);
          }
          break;
        case 'robust_scaler':
          lines.push(`scaler = RobustScaler()`);
          if (item.colunas && item.colunas.length > 0) {
            lines.push(`X_train[${[item.colunas]}] = scaler.fit_transform(X_train[${[item.colunas]}])`);
            lines.push(`X_test[${[item.colunas]}] = scaler.transform(X_test[${[item.colunas]}])`);
          } else {
            lines.push(`X_train = scaler.fit_transform(X_train)`);
            lines.push(`X_test = scaler.transform(X_test)`);
          }
          break;
        case 'label_encoder':
          lines.push(`le = LabelEncoder()`);
          if (item.colunas && item.colunas.length > 0) {
            for (const col of item.colunas) {
              lines.push(`X_train["${col}"] = le.fit_transform(X_train["${col}"])`);
              lines.push(`X_test["${col}"] = le.transform(X_test["${col}"])`);
            }
          }
          break;
        case 'one_hot_encoder':
          lines.push(`# One-Hot Encoding`);
          if (item.colunas && item.colunas.length > 0) {
            lines.push(`X_train = pd.get_dummies(X_train, columns=${JSON.stringify(item.colunas)})`);
            lines.push(`X_test = pd.get_dummies(X_test, columns=${JSON.stringify(item.colunas)})`);
          }
          break;
        case 'simple_imputer':
          lines.push(`imputer = SimpleImputer(strategy='mean')`);
          if (item.colunas && item.colunas.length > 0) {
            lines.push(`X_train[${[item.colunas]}] = imputer.fit_transform(X_train[${[item.colunas]}])`);
            lines.push(`X_test[${[item.colunas]}] = imputer.transform(X_test[${[item.colunas]}])`);
          } else {
            lines.push(`X_train = imputer.fit_transform(X_train)`);
            lines.push(`X_test = imputer.transform(X_test)`);
          }
          break;
        default:
          lines.push(`# ${item.label} - implementação manual necessária`);
      }
      lines.push('');
    }
    return lines.join('\n');
  }

  private getMetricsImports(metricas: ItemPipeline[]): string {
    const imports: string[] = [];
    imports.push('from sklearn.metrics import (');
    const metricLines: string[] = [];

    for (const metrica of metricas) {
      switch (metrica.valor) {
        case 'accuracy_score':
          metricLines.push('    accuracy_score,');
          break;
        case 'precision_score':
          metricLines.push('    precision_score,');
          break;
        case 'recall_score':
          metricLines.push('    recall_score,');
          break;
        case 'f1_score':
          metricLines.push('    f1_score,');
          break;
        case 'confusion_matrix':
          metricLines.push('    confusion_matrix,');
          break;
      }
    }

    if (metricLines.length > 0) {
      // Remove trailing comma from last item
      metricLines[metricLines.length - 1] = metricLines[metricLines.length - 1].replace(/,$/, '');
      imports.push(metricLines.join('\n'));
      imports.push(')');
    }

    return imports.join('\n');
  }

  private getDataLoading(resultado: ResultadoColetaDado): string {
    const lines: string[] = [];
    lines.push('# Carregamento dos dados');
    lines.push('df = pd.read_csv("seu_arquivo.csv")  # Ajuste o caminho do arquivo');
    lines.push('');
    lines.push('# Visualizar as primeiras linhas');
    lines.push('print("Primeiras linhas dos dados:")');
    lines.push('print(df.head())');
    lines.push('');
    lines.push('# Informações sobre os dados');
    lines.push('print("\\nInformações dos dados:")');
    lines.push('print(df.info())');
    return lines.join('\n');
  }

  private getFeatureSelection(resultado: ResultadoColetaDado): string {
    const lines: string[] = [];

    if (resultado.colunas && resultado.colunas.length > 0) {
      const atributos = resultado.colunas.filter(col => resultado.atributos[col]);
      const target = resultado.target;

      if (atributos.length > 0) {
        lines.push('# Atributos selecionados');
        lines.push(`atributos = ${JSON.stringify(atributos)}`);
        lines.push('X = df[atributos]');
      } else {
        lines.push('# Todos os atributos exceto o target');
        lines.push(`X = df.drop(columns=["${target}"])`);
      }

      if (target) {
        lines.push('');
        lines.push(`# Target`);
        lines.push(`y = df["${target}"]`);
      }
    }

    return lines.join('\n');
  }

  private getModelTraining(modelo: ItemPipeline, hiperparametros: any): string {
    const lines: string[] = [];
    const modeloNome = modelo.valor;

    // Build hyperparameters string
    const params: string[] = [];
    for (const [key, value] of Object.entries(hiperparametros)) {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'string') {
          params.push(`${key}="${value}"`);
        } else {
          params.push(`${key}=${value}`);
        }
      }
    }

    const paramsStr = params.length > 0 ? '\n    ' + params.join(',\n    ') + '\n' : '';

    lines.push(`# Configuração do modelo`);
    lines.push(`modelo = ${this.getModelClass(modeloNome)}(${paramsStr})`);
    lines.push('');
    lines.push('# Treinamento');
    lines.push('modelo.fit(X_train, y_train)');
    lines.push('');
    lines.push('print("Modelo treinado com sucesso!")');

    return lines.join('\n');
  }

  private getModelClass(modeloValor: string): string {
    const classes: Record<string, string> = {
      'knn': 'KNeighborsClassifier',
      'arvore_decisao': 'DecisionTreeClassifier',
      'svm': 'SVC',
      'regressao_logistica': 'LogisticRegression',
      'regressao_linear': 'LinearRegression',
      'k_means': 'KMeans',
      'pca': 'PCA'
    };
    return classes[modeloValor] || 'Modelo';
  }

  private getMetricsEvaluation(metricas: ItemPipeline[]): string {
    const lines: string[] = [];
    lines.push('print("\\n" + "=" * 50)');
    lines.push('print("MÉTRICAS DE AVALIAÇÃO")');
    lines.push('print("=" * 50)');
    lines.push('');

    for (const metrica of metricas) {
      switch (metrica.valor) {
        case 'accuracy_score':
          lines.push('# Acurácia');
          lines.push('acuracia = accuracy_score(y_test, y_pred)');
          lines.push('print(f"Acurácia: {acuracia:.4f}")');
          lines.push('');
          break;
        case 'precision_score':
          lines.push('# Precisão');
          lines.push('precisao = precision_score(y_test, y_pred, average="weighted")');
          lines.push('print(f"Precisão: {precisao:.4f}")');
          lines.push('');
          break;
        case 'recall_score':
          lines.push('# Recall');
          lines.push('recall = recall_score(y_test, y_pred, average="weighted")');
          lines.push('print(f"Recall: {recall:.4f}")');
          lines.push('');
          break;
        case 'f1_score':
          lines.push('# F1-Score');
          lines.push('f1 = f1_score(y_test, y_pred, average="weighted")');
          lines.push('print(f"F1-Score: {f1:.4f}")');
          lines.push('');
          break;
        case 'confusion_matrix':
          lines.push('# Matriz de Confusão');
          lines.push('matriz = confusion_matrix(y_test, y_pred)');
          lines.push('print("\\nMatriz de Confusão:")');
          lines.push('print(matriz)');
          lines.push('');
          break;
      }
    }

    return lines.join('\n');
  }

  downloadScript(content: string, filename: string = 'pipeline_ml.py'): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
