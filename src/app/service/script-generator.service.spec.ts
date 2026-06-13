import { TestBed } from '@angular/core/testing';

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
    TestBed.configureTestingModule({});
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
});
