import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ItemPipeline, ResultadoColetaDado } from '../models/item-coleta-dado.model';
import { environment } from '../../environments/environment';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { slugificarNome } from './slug.util';
import { RelatorioPdfService } from './relatorio-pdf.service';

// Pré-processadores com template curado no gerador. Itens fora deste conjunto
// (registrados pelo admin) são gerados de forma genérica a partir do bloco `execucao`.
const PRE_PROC_BUILTINS = new Set<string>([
  'standard_scaler', 'minmax_scaler', 'robust_scaler', 'normalizer',
  'onehot_encoder', 'ordinal_encoder', 'label_encoder', 'simple_imputer',
  'polynomial_features', 'power_transformer',
]);

@Injectable({
  providedIn: 'root'
})
export class ScriptGeneratorService {

  constructor(private http: HttpClient, private relatorioPdf: RelatorioPdfService) { }

  /** Baixa o modelo treinado (id) e o mescla no bundle sob `<subpasta>/modelo/`,
   *  escrevendo também os exemplos `usar_modelo_mlflow.py` e `usar_modelo_joblib.py`.
   *  Best-effort: se o download falhar (modelo indisponível), o bundle segue sem o modelo. */
  async anexarModeloTreinado(
    folder: JSZip, entry: any, coleta: ResultadoColetaDado | undefined, subpasta?: string,
  ): Promise<void> {
    if (!entry?.id) return;
    try {
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiUrl}classificador/modelo/${entry.id}/artefato`, { responseType: 'blob' })
      );
      const dest = subpasta ? folder.folder(subpasta)! : folder;
      const modeloDir = dest.folder('modelo')!;
      const zipModelo = await JSZip.loadAsync(blob as Blob);
      for (const nome of Object.keys(zipModelo.files)) {
        const f = zipModelo.files[nome];
        if (f.dir) continue;
        modeloDir.file(nome, await f.async('uint8array'));
      }
      dest.file('usar_modelo_mlflow.py', this.gerarUsarModeloMlflow(entry, coleta));
      dest.file('usar_modelo_joblib.py', this.gerarUsarModeloJoblib(entry, coleta));
    } catch {
      /* modelo indisponível: segue sem ele */
    }
  }

  /** Colunas de entrada e exemplo zerado compartilhados pelos dois `usar_modelo_*.py`. */
  private montarEntradaExemplo(entry: any, coleta: ResultadoColetaDado | undefined): { colsPy: string; zeros: string } {
    const cols: string[] = (entry?.atributos?.length ? entry.atributos
      : (coleta?.colunas || []).filter((c: string) => c !== coleta?.target)) || [];
    return {
      colsPy: cols.map(c => JSON.stringify(c)).join(', '),
      zeros: cols.map(() => '0').join(', '),
    };
  }

  /** Trecho comum aos dois exemplos: colunas, exemplo e previsão. */
  private corpoPrevisao(entry: any, coleta: ResultadoColetaDado | undefined): string[] {
    const { colsPy, zeros } = this.montarEntradaExemplo(entry, coleta);
    return [
      '# Colunas de entrada, na ordem esperada (as mesmas do treino):',
      `COLUNAS = [${colsPy}]`,
      '# Troque os valores abaixo pelo seu novo exemplo (na ordem de COLUNAS):',
      `exemplo = pd.DataFrame([[${zeros}]], columns=COLUNAS)`,
      '',
      'previsao = modelo.predict(exemplo)',
      'print("Previsão:", previsao)',
      '',
    ];
  }

  /** Código Python que carrega o modelo salvo via MLflow (pasta modelo/) e prevê. */
  private gerarUsarModeloMlflow(entry: any, coleta: ResultadoColetaDado | undefined): string {
    return [
      '"""Usa o modelo já treinado para prever um novo exemplo (via MLflow).',
      '',
      'O modelo está na pasta ./modelo (formato MLflow). Instale as MESMAS versões do',
      'treino (pickle é sensível à versão do scikit-learn) e o MLflow:',
      '    pip install -r modelo/requirements.txt',
      '    pip install mlflow',
      '',
      'Sem o MLflow instalado? Use o usar_modelo_joblib.py, que carrega o mesmo modelo.',
      '"""',
      'import pandas as pd',
      'import mlflow.sklearn',
      '',
      'modelo = mlflow.sklearn.load_model("modelo")',
      '',
      ...this.corpoPrevisao(entry, coleta),
    ].join('\n');
  }

  /** Código Python que carrega o modelo salvo via joblib (modelo/model.pkl) e prevê. */
  private gerarUsarModeloJoblib(entry: any, coleta: ResultadoColetaDado | undefined): string {
    return [
      '"""Usa o modelo já treinado para prever um novo exemplo (via joblib).',
      '',
      'Carrega direto o arquivo ./modelo/model.pkl — não precisa do MLflow.',
      'Instale as MESMAS versões do treino (pickle é sensível à versão do scikit-learn):',
      '    pip install -r modelo/requirements.txt',
      '"""',
      'import joblib',
      'import pandas as pd',
      '',
      'modelo = joblib.load("modelo/model.pkl")',
      '',
      ...this.corpoPrevisao(entry, coleta),
    ].join('\n');
  }

  /** Script Python completo de UM modelo (dados → split → X|y → modelo → métricas).
   *  Usado para exibir o código de um ramo no inspetor da Trilha. */
  gerarScriptModelo(
    resultadoColetaDado: ResultadoColetaDado | undefined,
    modelo: ItemPipeline | undefined,
    metricas: ItemPipeline[],
    hiperparametros: any,
    preProcessamentoConfig?: any,
  ): string {
    return this.generatePythonScript(resultadoColetaDado, modelo, metricas, hiperparametros, preProcessamentoConfig);
  }

  async generatePipelineBundle(
    resultadoColetaDado: ResultadoColetaDado | undefined,
    modeloSelecionado: ItemPipeline | undefined,
    metricasSelecionadas: ItemPipeline[],
    hiperparametros: any,
    preProcessamentoConfig?: any,
    resultadosTreinamento?: Record<string, any>,
    nomeExperimento?: string | null
  ): Promise<void> {
    const zip = new JSZip();
    const folder = zip.folder('pipeline_iana')!;

    const modelosTreinados = resultadosTreinamento ? Object.values(resultadosTreinamento) : [];
    const isMultiModelo = modelosTreinados.length > 1;

    const script = isMultiModelo
      ? this.generateMultiModelScript(resultadoColetaDado, modelosTreinados, metricasSelecionadas, preProcessamentoConfig)
      : this.generatePythonScript(resultadoColetaDado, modeloSelecionado, metricasSelecionadas, hiperparametros, preProcessamentoConfig);

    folder.file('pipeline.py', script);

    // Quem decide não é a fonte, é o SCRIPT: ele lê `data/*.csv` sempre que não souber
    // reproduzir os dados sozinho (sem loader do sklearn, sem id do UCI, sem gerador
    // sintético). Condicionar ao `fonteDados !== 'dataset'` deixava o zip de um dataset de
    // exemplo não-sklearn sem CSV nenhum, com o script morrendo em FileNotFoundError.
    if (this.scriptLeCsv(resultadoColetaDado)) {
      if (resultadoColetaDado?.treino?.dados && resultadoColetaDado.treino.dados.length > 0) {
        folder.file('data/treino.csv', this.convertToCsv(resultadoColetaDado.treino.dados));
      }
      if (resultadoColetaDado?.teste?.dados && resultadoColetaDado.teste.dados.length > 0) {
        folder.file('data/teste.csv', this.convertToCsv(resultadoColetaDado.teste.dados));
      }
    }

    folder.file('README.md', this.generateReadme(modeloSelecionado, resultadoColetaDado, isMultiModelo ? modelosTreinados : undefined, modelosTreinados.length > 0));

    // Modelo(s) já treinado(s) + `usar_modelo_{mlflow,joblib}.py` (best-effort; requer que o modelo
    // ainda exista no backend). Single: `modelo/` na raiz; multi: `modelos/<nome>/`.
    for (const entry of modelosTreinados) {
      const subpasta = isMultiModelo ? `modelos/${slugificarNome(entry?.nome_modelo) || 'modelo'}` : undefined;
      await this.anexarModeloTreinado(folder, entry, resultadoColetaDado, subpasta);
    }

    // PDF promocional do Hub de Inovação em IA (best-effort: o zip segue sem ele em caso de falha).
    try {
      folder.file('hub-ia.pdf', await this.relatorioPdf.gerarPromoHub());
    } catch { /* segue sem o promocional */ }

    const content = await zip.generateAsync({ type: 'blob' });
    // Experimento salvo pelo aluno -> nome do arquivo usa o nome salvo
    // (ex.: "overfit" -> pipeline_overfit.zip); senão, genérico por modelo+data.
    const slug = slugificarNome(nomeExperimento);
    const nomePipeline = isMultiModelo ? 'comparacao_modelos' : (modeloSelecionado?.label || 'modelo');
    const data = new Date().toISOString().slice(0, 10);
    saveAs(content, slug ? `pipeline_${slug}.zip` : `pipeline_${nomePipeline}_${data}.zip`);
  }

  private generateMultiModelScript(
    resultadoColetaDado: ResultadoColetaDado | undefined,
    modelosTreinados: any[],
    metricasSelecionadas: ItemPipeline[],
    preProcessamentoConfig?: any
  ): string {
    const lines: string[] = [];

    lines.push('#!/usr/bin/env python3');
    lines.push('# -*- coding: utf-8 -*-');
    lines.push('"""');
    lines.push('Comparação de Modelos de Aprendizado de Máquina — gerado pelo H2IA Tutor');
    lines.push('Data: ' + new Date().toLocaleDateString('pt-BR'));
    lines.push('Modelos: ' + modelosTreinados.map(m => m.nome_modelo).join(', '));
    lines.push('"""');
    lines.push('');

    // Imports
    lines.push('import pandas as pd');
    lines.push('import numpy as np');
    lines.push('from sklearn.model_selection import train_test_split');

    if (resultadoColetaDado?.fonteDados === 'dataset' && resultadoColetaDado.nomeDataset) {
      const ds = this.getToyDatasetLoader(resultadoColetaDado.datasetId ?? resultadoColetaDado.nomeDataset);
      if (ds) {
        const fn = ds.importLine.split('(')[0];
        lines.push(`from sklearn.datasets import ${fn}`);
      }
    }

    if (preProcessamentoConfig?.itens?.length > 0) {
      // Os PARÊNTESES são obrigatórios: a lista ocupa duas linhas, e sem eles o Python vê uma
      // vírgula solta no fim da primeira e recusa o arquivo inteiro
      // (`SyntaxError: trailing comma not allowed without surrounding parentheses`).
      // Era isso que tornava TODO script de comparação de modelos com pré-processamento
      // inválido — nem chegava a importar pandas.
      lines.push('from sklearn.preprocessing import (');
      lines.push('    StandardScaler, MinMaxScaler, RobustScaler, Normalizer,');
      lines.push('    LabelEncoder, OneHotEncoder, OrdinalEncoder,');
      lines.push('    PolynomialFeatures, PowerTransformer');
      lines.push(')');
      lines.push('from sklearn.impute import SimpleImputer');
    }

    // One import line per unique model class
    const importadosSet = new Set<string>();
    for (const m of modelosTreinados) {
      const imp = this.getModelImport(m.modelo ?? '', m.execucao);
      if (imp && !imp.startsWith('#') && !importadosSet.has(imp)) {
        importadosSet.add(imp);
        lines.push(imp);
      }
    }

    const metricImports: string[] = [];
    for (const metrica of metricasSelecionadas) {
      if (!metricImports.includes(metrica.valor)) metricImports.push(metrica.valor);
    }
    if (metricImports.length > 0) {
      lines.push(`from sklearn.metrics import (${metricImports.join(', ')})`);
    }
    lines.push('');

    // Precisa vir ANTES da geração das funções: a de seleção de features muda de assinatura
    // em agrupamento (sem y), e é ela que a execução principal chama.
    const isClustering = modelosTreinados.some(m => {
      const cls = m.modelo ?? '';
      return ['k_means', 'dbscan', 'agglomerative'].includes(cls);
    });

    // Data loading
    lines.push(this.generateDataLoadingFunction(resultadoColetaDado));
    lines.push('');
    lines.push(this.generateFeatureSelectionFunction(resultadoColetaDado, isClustering));
    lines.push('');
    lines.push(this.generatePreprocessingFunction(resultadoColetaDado, preProcessamentoConfig));
    lines.push('');
    lines.push(this.generateEvaluationFunction(metricasSelecionadas));
    lines.push('');

    // Dict with all models
    lines.push('# ============================================');
    lines.push('# Dicionário com todos os modelos a comparar');
    lines.push('# ============================================');
    lines.push('MODELOS = {');
    for (const m of modelosTreinados) {
      const cls = this.getModelClass(m.modelo ?? '', m.execucao);
      lines.push(`    "${m.nome_modelo}": ${cls}(),`);
    }
    lines.push('}');
    lines.push('');

    lines.push('# ============================================');
    lines.push('# Execução Principal');
    lines.push('# ============================================');
    lines.push('');
    lines.push('if __name__ == "__main__":');

    if (resultadoColetaDado?.fonteDados === 'dataset' && resultadoColetaDado.nomeDataset) {
      if (isClustering) {
        lines.push('    X, y = carregar_dados()');
        lines.push('    X_train, X_test = selecionar_features(X)');
      } else {
        lines.push('    X, y = carregar_dados()');
        lines.push('    X_train, X_test, y_train, y_test = selecionar_features(X, y)');
      }
    } else {
      if (isClustering) {
        lines.push('    train_df, test_df = carregar_dados()');
        lines.push('    X_train, X_test = selecionar_features(train_df, test_df)');
      } else {
        lines.push('    train_df, test_df = carregar_dados()');
        lines.push('    X_train, y_train, X_test, y_test = selecionar_features(train_df, test_df)');
      }
    }
    lines.push('    X_train, X_test = aplicar_preprocessamento(X_train, X_test)');
    if (!isClustering && this.temLabelEncoderAlvo(preProcessamentoConfig, resultadoColetaDado?.target)) {
      lines.push(...this.linhasLabelEncoderAlvo());
    }
    lines.push('');
    lines.push('    resultados = {}');
    lines.push('    for nome, modelo in MODELOS.items():');
    if (isClustering) {
      lines.push('        modelo.fit(X_train)');
      lines.push('        resultados[nome] = avaliar_modelo(modelo, X_test)');
    } else {
      lines.push('        modelo.fit(X_train, y_train)');
      lines.push('        resultados[nome] = avaliar_modelo(modelo, X_test, y_test)');
    }
    lines.push('');
    lines.push('    # Tabela de comparação');
    lines.push('    print("\\n" + "=" * 60)');
    lines.push('    print("COMPARAÇÃO FINAL DE MODELOS")');
    lines.push('    print("=" * 60)');
    lines.push('    for nome, res in resultados.items():');
    lines.push('        print(f"\\n{nome}:")');
    lines.push('        for metrica, valor in res.items():');
    lines.push('            if isinstance(valor, float):');
    lines.push('                print(f"  {metrica}: {valor:.4f}")');
    lines.push('            elif hasattr(valor, "tolist"):');
    lines.push('                print(f"  {metrica}: {valor.tolist()}")');
    lines.push('            else:');
    lines.push('                print(f"  {metrica}: {valor}")');
    lines.push('');

    return lines.join('\n');
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

  private generateReadme(modelo: ItemPipeline | undefined, resultado: ResultadoColetaDado | undefined, modelosTreinados?: any[], temModelo = false): string {
    const lines: string[] = [];
    lines.push('# Pipeline de Aprendizado de Máquina - H2IA Tutor');
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
    if (temModelo) {
      lines.push('├── modelo/              # Modelo JÁ treinado (formato MLflow)');
      lines.push('├── usar_modelo_mlflow.py # Carrega o modelo via MLflow e faz uma previsão');
      lines.push('├── usar_modelo_joblib.py # Carrega o modelo via joblib (sem MLflow) e faz uma previsão');
    }
    lines.push('├── hub-ia.pdf           # Conheça o Hub de Inovação em IA (ia.ufpel.edu.br)');
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
    if (temModelo) {
      lines.push('## Como usar o modelo JÁ treinado (sem re-treinar)');
      lines.push('');
      lines.push('A pasta `modelo/` contém o modelo salvo no formato MLflow (com `MLmodel`,');
      lines.push('`model.pkl` e `requirements.txt`). Há DUAS formas de usá-lo:');
      lines.push('');
      lines.push('```bash');
      lines.push('pip install -r modelo/requirements.txt   # mesmas versões do treino');
      lines.push('');
      lines.push('# Opção 1 — via joblib (mais simples, sem dependência extra):');
      lines.push('python usar_modelo_joblib.py');
      lines.push('');
      lines.push('# Opção 2 — via MLflow (usa os metadados do formato MLmodel):');
      lines.push('pip install mlflow');
      lines.push('python usar_modelo_mlflow.py');
      lines.push('```');
      lines.push('');
      lines.push('> Edite os valores de exemplo nos `usar_modelo_*.py` para os seus dados.');
      lines.push('> No modo comparação, cada modelo fica em `modelos/<nome>/` com seus `usar_modelo_*.py`.');
      lines.push('');
    }

    if (modelosTreinados && modelosTreinados.length > 1) {
      lines.push('## Modelos Comparados');
      lines.push('');
      for (const m of modelosTreinados) {
        lines.push(`- **${m.nome_modelo}**`);
      }
      lines.push('');
    } else if (modelo) {
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
    lines.push('*Gerado automaticamente pelo H2IA Tutor - Plataforma de Ensino de Aprendizado de Máquina*');

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
    lines.push('Pipeline de Aprendizado de Máquina gerado pelo H2IA Tutor');
    lines.push('Data: ' + new Date().toLocaleDateString('pt-BR'));
    lines.push('"""');
    lines.push('');

    // Imports
    const imports = this.collectImports(modeloSelecionado, metricasSelecionadas, preProcessamentoConfig, resultadoColetaDado);
    lines.push(imports.join('\n'));
    lines.push('');

    // Declarado aqui (e não junto da execução principal) porque a seleção de features muda de
    // assinatura em agrupamento — sem y — e é ela que a execução principal chama.
    const isClustering = modeloSelecionado?.dadosRotulados === false;

    // Functions for each pipeline stage
    lines.push(this.generateDataLoadingFunction(resultadoColetaDado));
    lines.push('');
    lines.push(this.generateFeatureSelectionFunction(resultadoColetaDado, isClustering));
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
    if (!isClustering && this.temLabelEncoderAlvo(preProcessamentoConfig, resultadoColetaDado?.target)) {
      lines.push(...this.linhasLabelEncoderAlvo());
    }
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

    // Preprocessing imports.
    // Para os 10 built-ins mantemos o bloco curado (os templates usam os nomes de
    // classe diretamente). Para itens registrados pelo admin (valor desconhecido),
    // o import vem do bloco `execucao` — assim aparecem no código sem hardcode.
    if (preProcessamentoConfig?.itens?.length > 0) {
      const itens = preProcessamentoConfig.itens as any[];
      if (itens.some(i => PRE_PROC_BUILTINS.has(i.valor))) {
        imports.push('from sklearn.preprocessing import (');
        imports.push('    StandardScaler, MinMaxScaler, RobustScaler, Normalizer,');
        imports.push('    LabelEncoder, OneHotEncoder, OrdinalEncoder,');
        imports.push('    PolynomialFeatures, PowerTransformer');
        imports.push(')');
        imports.push('from sklearn.impute import SimpleImputer');
      }
      for (const item of itens) {
        if (!PRE_PROC_BUILTINS.has(item.valor) && item.execucao?.modulo && item.execucao?.classe) {
          const line = `from ${item.execucao.modulo} import ${item.execucao.classe}`;
          if (!imports.includes(line)) imports.push(line);
        }
      }
    }

    // Model import
    if (modelo) {
      const imp = this.getModelImport(modelo.valor, modelo.execucao);
      if (imp) imports.push(imp);
    }

    // Metrics imports
    const metricImports: string[] = [];
    const metricModuleImports: string[] = [];
    for (const metrica of metricas) {
      if (metrica.execucao?.modulo && metrica.execucao?.funcao) {
        const importLine = `from ${metrica.execucao.modulo} import ${metrica.execucao.funcao}`;
        if (!metricModuleImports.includes(importLine)) metricModuleImports.push(importLine);
      } else {
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
          case 'r2_score':
            if (!metricImports.includes('r2_score')) metricImports.push('r2_score');
            break;
          case 'mean_squared_error':
            if (!metricImports.includes('mean_squared_error')) metricImports.push('mean_squared_error');
            break;
          case 'mean_absolute_error':
            if (!metricImports.includes('mean_absolute_error')) metricImports.push('mean_absolute_error');
            break;
          // RMSE não entra na lista de imports de propósito: o cálculo sai da raiz do erro
          // quadrático com numpy (ver generateEvaluationFunction), o que dispensa a função
          // `root_mean_squared_error` — que só existe no sklearn 1.4+.
          case 'root_mean_squared_error':
            break;
        }
      }
    }
    for (const imp of metricModuleImports) {
      imports.push(imp);
    }
    if (metricImports.length > 0) {
      imports.push(`from sklearn.metrics import (${metricImports.join(', ')})`);
    }

    return imports;
  }

  private getModelImport(modeloValor: string, execucao?: any): string {
    if (execucao?.modulo && execucao?.classe) {
      return `from ${execucao.modulo} import ${execucao.classe}`;
    }
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
      'pca': 'from sklearn.decomposition import PCA',
      // Classificadores novos
      'sgd': 'from sklearn.linear_model import SGDClassifier',
      'perceptron': 'from sklearn.linear_model import Perceptron',
      // Regressores novos
      'ridge': 'from sklearn.linear_model import Ridge',
      'quantile': 'from sklearn.linear_model import QuantileRegressor',
      'huber': 'from sklearn.linear_model import HuberRegressor',
      'ransac': 'from sklearn.linear_model import RANSACRegressor',
      'theilsen': 'from sklearn.linear_model import TheilSenRegressor',
      'svr': 'from sklearn.svm import SVR',
      'mlp_regressor': 'from sklearn.neural_network import MLPRegressor',
      'knn_regressor': 'from sklearn.neighbors import KNeighborsRegressor',
      'regressao_polinomial': 'from sklearn.preprocessing import PolynomialFeatures\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.pipeline import make_pipeline'
    };
    return imports[modeloValor] || '';
  }

  /** O script exportado vai ler `data/treino.csv`/`data/teste.csv`?
   *
   *  Espelha a decisão de `generateDataLoadingFunction`: com dataset de exemplo, o script só lê
   *  CSV quando não há loader do sklearn, nem id do UCI, nem gerador sintético para ele. É essa
   *  a condição que manda anexar os CSVs ao zip — e não a fonte dos dados. */
  private scriptLeCsv(resultado?: ResultadoColetaDado): boolean {
    if (resultado?.fonteDados !== 'dataset' || !resultado.nomeDataset) return true;
    const chave = resultado.datasetId ?? resultado.nomeDataset;
    return !this.getToyDatasetLoader(chave)
      && this.getUciDatasetId(chave) === null
      && !this.getGeradorSintetico(chave, resultado.datasetSeed);
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

      const gerado = this.getGeradorSintetico(datasetKey, resultado.datasetSeed);
      if (gerado) {
        return [
          '# ============================================',
          '# Função: Carregamento dos Dados',
          '# ============================================',
          'def carregar_dados():',
          `    """Gera o dataset sintético '${resultado.nomeDataset}' com a MESMA semente da plataforma."""`,
          ...gerado,
          '    ',
          '    print("Primeiras amostras (X):")',
          '    print(X.head())',
          '    print(f"Shape de X: {X.shape}")',
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

  /** Código que reproduz um dataset SINTÉTICO (os `gen_*` do catálogo).
   *
   *  Sem isto o gerador caía no ramo "ler data/treino.csv" — e o bundle não anexa CSV quando a
   *  fonte é um dataset de exemplo, então o script exportado morria em FileNotFoundError na
   *  primeira linha. Aqui o próprio script gera os dados, com a semente que o servidor usou
   *  (`seed` na resposta do endpoint), espelhando `carregar_gerador` do backend
   *  (`app/models/dataset_loaders.py`) — inclusive os nomes das colunas, de que o
   *  pré-processamento depende para achar as colunas certas.
   *
   *  `null` quando o id não é de um gerador conhecido. Divergir do backend aqui produz um
   *  script que roda mas com outros dados; ao mexer num gerador de lá, ajuste os dois. */
  private getGeradorSintetico(id: string, seed?: number | null): string[] | null {
    // Quando a plataforma não fixou semente (o caso comum: `seed` vem nulo), os dados que
    // treinaram o modelo são irrecuperáveis. Emitir `random_state=None` deixaria o script
    // sorteando um dataset novo a cada execução — o aluno rodaria duas vezes e veria duas
    // métricas. Fixamos 42 e avisamos no próprio script que os números serão parecidos, não
    // idênticos aos da tela.
    const semSemente = seed === null || seed === undefined;
    const rsArg = semSemente ? '42' : String(seed);
    const colunas = (n: number) => `[f"atributo_{i + 1}" for i in range(${n})]`;
    const nota = semSemente
      ? ['    # A plataforma gerou estes dados SEM semente fixa, então os valores aqui saem',
         '    # parecidos com os da tela, não idênticos. A semente 42 abaixo é para que ESTE',
         '    # script dê sempre o mesmo resultado quando você rodar de novo.']
      : [];

    switch (id) {
      case 'gen_classification':
        return [
          ...nota,
          '    from sklearn.datasets import make_classification',
          `    dados, alvo = make_classification(`,
          `        n_samples=300, n_features=4, n_informative=2, n_redundant=0,`,
          `        n_classes=2, n_clusters_per_class=1, random_state=${rsArg},`,
          '    )',
          `    X = pd.DataFrame(dados, columns=${colunas(4)})`,
          '    y = pd.Series(alvo, name="target")',
        ];
      case 'gen_blobs':
        return [
          ...nota,
          '    from sklearn.datasets import make_blobs',
          `    dados, alvo = make_blobs(n_samples=300, n_features=2, centers=3, random_state=${rsArg})`,
          `    X = pd.DataFrame(dados, columns=${colunas(2)})`,
          // Agrupamento não expõe target (o backend não põe a coluna no dataframe).
          '    y = None',
        ];
      case 'gen_moons':
        return [
          ...nota,
          '    from sklearn.datasets import make_moons',
          `    dados, alvo = make_moons(n_samples=300, noise=0.1, random_state=${rsArg})`,
          '    X = pd.DataFrame(dados, columns=["atributo_1", "atributo_2"])',
          '    y = pd.Series(alvo, name="target")',
        ];
      case 'gen_circles':
        return [
          ...nota,
          '    from sklearn.datasets import make_circles',
          `    dados, alvo = make_circles(n_samples=300, noise=0.05, factor=0.5, random_state=${rsArg})`,
          '    X = pd.DataFrame(dados, columns=["atributo_1", "atributo_2"])',
          '    y = pd.Series(alvo, name="target")',
        ];
      case 'gen_regression':
        return [
          ...nota,
          '    from sklearn.datasets import make_regression',
          `    dados, alvo = make_regression(n_samples=300, n_features=3, noise=10.0, random_state=${rsArg})`,
          `    X = pd.DataFrame(dados, columns=${colunas(3)})`,
          '    y = pd.Series(alvo, name="target")',
        ];
      case 'gen_sorvete':
        return [
          ...nota,
          `    rng = np.random.RandomState(${rsArg})`,
          '    temperatura = rng.uniform(15, 40, 300)',
          '    pessoas = rng.uniform(0, 500, 300)',
          '    alvo = np.clip(3.0 * (temperatura - 15) + 0.2 * pessoas + rng.normal(0, 12, 300), 0, None).round()',
          '    X = pd.DataFrame({"temperatura": temperatura.round(1), "pessoas_na_praia": pessoas.round()})',
          '    y = pd.Series(alvo, name="target")',
        ];
      case 'gen_cardume':
        return [
          ...nota,
          '    from sklearn.datasets import make_blobs',
          `    dados, alvo = make_blobs(n_samples=300, n_features=2, centers=3, random_state=${rsArg})`,
          '    X = pd.DataFrame(dados, columns=["velocidade", "direcao"])',
          '    y = None',
        ];
      case 'gen_cachorro':
        return [
          ...nota,
          `    rng = np.random.RandomState(${rsArg})`,
          '    altura = rng.uniform(20, 70, 200)',
          '    alvo = np.clip(0.6 * (altura - 15) + rng.normal(0, 3, 200), 1, None).round(1)',
          '    X = pd.DataFrame({"altura_cm": altura.round(1)})',
          '    y = pd.Series(alvo, name="target")',
        ];
      default:
        return null;
    }
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

  private generateFeatureSelectionFunction(
    resultado: ResultadoColetaDado | undefined,
    ehAgrupamento = false,
  ): string {
    if (resultado?.fonteDados === 'dataset' && resultado.nomeDataset) {
      const splitPct = resultado.porcentagemTreino || 70;
      const testPct = 100 - splitPct;
      const shuffle = resultado.embaralharDados === false ? 'False' : 'True';
      const stratify = resultado.estratificarDados && resultado.embaralharDados !== false ? 'y' : 'None';
      // Agrupamento não tem y — e a execução principal chama `selecionar_features(X)` com um
      // argumento só. Gerar aqui a versão de dois parâmetros deixava o script com um
      // TypeError garantido (faltando 'y') em todo pipeline exploratório sobre dataset.
      // As colunas que o aluno DEIXOU MARCADAS na coleta. Sem isto o script usava o dataset
      // inteiro (`X = dados.data`), ignorando a seleção de features — o backend treinava com as
      // colunas escolhidas e o script exportado com todas, dando outra métrica. O caminho de
      // upload já fazia esse filtro (`atributos = [...]`); só o de dataset não.
      const marcadas = Object.entries(resultado.atributos || {})
        .filter(([col, ligada]) => ligada && col !== resultado.target)
        .map(([col]) => col);
      const filtroFeatures = marcadas.length > 0
        ? ['    # Só as colunas marcadas como atributo na tela',
           `    atributos = [${marcadas.map(c => `"${c}"`).join(', ')}]`,
           '    X = X[atributos]',
           '    ']
        : [];

      if (ehAgrupamento) {
        return [
          '# ============================================',
          '# Função: Seleção de Features',
          '# ============================================',
          'def selecionar_features(X):',
          '    """Divide o dataset em treino e teste (agrupamento não usa target)."""',
          ...filtroFeatures,
          '    X_train, X_test = train_test_split(',
          `        X, test_size=${(testPct / 100).toFixed(2)}, random_state=42, shuffle=${shuffle}`,
          '    )',
          '    ',
          '    print("\\nDivisão treino/teste:")',
          `    print(f"Treino: {X_train.shape[0]} amostras (${splitPct}%)")`,
          `    print(f"Teste:  {X_test.shape[0]} amostras (${testPct}%)")`,
          '    ',
          '    return X_train, X_test'
        ].join('\n');
      }
      return [
        '# ============================================',
        '# Função: Seleção de Features e Target',
        '# ============================================',
        'def selecionar_features(X, y):',
        '    """Divide o dataset em treino e teste, mantendo a coluna target separada."""',
        ...filtroFeatures,
        `    X_train, X_test, y_train, y_test = train_test_split(`,
        `        X, y, test_size=${(testPct / 100).toFixed(2)}, random_state=42,`,
        `        shuffle=${shuffle}, stratify=${stratify}`,
        '    )',
        '    ',
        '    print("\\nDivisão treino/teste:")',
        // O `${splitPct}` é interpolado aqui, no TypeScript; `{X_train.shape[0]}` fica literal
        // para a f-string do Python. Faltar o `$` gera um campo que o Python não conhece
        // (NameError: splitPct) e o script exportado nem chega a treinar.
        `    print(f"Treino: {X_train.shape[0]} amostras (${splitPct}%)")`,
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

  /** Há um LabelEncoder mirando o ALVO? (colunas vazias = alvo, ou colunas incluem o target) */
  private temLabelEncoderAlvo(preProcessamentoConfig: any, targetCol?: string): boolean {
    const itens = preProcessamentoConfig?.itens as any[] | undefined;
    if (!itens?.length) return false;
    return itens.some((it: any) => it.valor === 'label_encoder'
      && (!it.colunas?.length || (!!targetCol && it.colunas.includes(targetCol))));
  }

  /** Linhas que codificam o rótulo (y_train/y_test) com LabelEncoder no fluxo principal. */
  private linhasLabelEncoderAlvo(): string[] {
    return [
      '    # Codificar o rótulo (LabelEncoder no alvo)',
      '    le_alvo = LabelEncoder()',
      '    y_train = le_alvo.fit_transform(y_train)',
      '    y_test = le_alvo.transform(y_test)',
      '    # Mapa classe -> número (use le_alvo.inverse_transform(...) para voltar aos nomes)',
      '    print("Classes codificadas:", dict(zip(le_alvo.classes_, le_alvo.transform(le_alvo.classes_))))',
    ];
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
      // Dois formatos, porque o pandas cobra colchetes diferentes em cada posição:
      // `colsArray` é a LISTA (`["a","b"]`), para `drop(columns=...)` e
      // `get_feature_names_out(...)`; `colsIdx` é o INDEXADOR (`[["a","b"]]`), para
      // `X_train[[...]]`. Usar a lista como indexador vira `X_train["a","b"]`, que o pandas
      // lê como uma única chave de tupla e estoura KeyError no primeiro pré-processador.
      const colsArray = colunas.length > 0
        ? `[${colunas.map((c: string) => `"${c}"`).join(', ')}]`
        : null;
      const colsIdx = colsArray ? `[${colsArray}]` : null;

      lines.push('    ');

      switch (item.valor) {
        case 'standard_scaler':
          lines.push(`    # ${item.label}: Remove média e escala para variância unitária`);
          lines.push(`    scaler = StandardScaler(${this.preprocArgs(item, '')})`);
          if (colsArray) {
            lines.push(`    X_train${colsIdx} = scaler.fit_transform(X_train${colsIdx})`);
            lines.push(`    X_test${colsIdx} = scaler.transform(X_test${colsIdx})`);
          } else {
            lines.push('    X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'minmax_scaler':
          lines.push(`    # ${item.label}: Escala dados para intervalo [0, 1]`);
          lines.push(`    scaler = MinMaxScaler(${this.preprocArgs(item, '')})`);
          if (colsArray) {
            lines.push(`    X_train${colsIdx} = scaler.fit_transform(X_train${colsIdx})`);
            lines.push(`    X_test${colsIdx} = scaler.transform(X_test${colsIdx})`);
          } else {
            lines.push('    X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'robust_scaler':
          lines.push(`    # ${item.label}: Escala usando estatísticas robustas a outliers`);
          lines.push(`    scaler = RobustScaler(${this.preprocArgs(item, '')})`);
          if (colsArray) {
            lines.push(`    X_train${colsIdx} = scaler.fit_transform(X_train${colsIdx})`);
            lines.push(`    X_test${colsIdx} = scaler.transform(X_test${colsIdx})`);
          } else {
            lines.push('    X_train = pd.DataFrame(scaler.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(scaler.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'normalizer':
          lines.push(`    # ${item.label}: Normaliza amostras para norma unitária`);
          lines.push(`    normalizer = Normalizer(${this.preprocArgs(item, 'norm="l2"')})`);
          if (colsArray) {
            lines.push(`    X_train${colsIdx} = normalizer.fit_transform(X_train${colsIdx})`);
            lines.push(`    X_test${colsIdx} = normalizer.transform(X_test${colsIdx})`);
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
          lines.push(`    encoder = OrdinalEncoder(${this.preprocArgs(item, 'handle_unknown="use_encoded_value", unknown_value=-1')})`);
          if (colsArray) {
            lines.push(`    X_train${colsIdx} = encoder.fit_transform(X_train${colsIdx})`);
            lines.push(`    X_test${colsIdx} = encoder.transform(X_test${colsIdx})`);
          }
          break;

        case 'label_encoder': {
          // O LabelEncoder do ALVO é aplicado no fluxo principal (sobre y_train/y_test),
          // fora desta função que recebe apenas X. Aqui só codificamos colunas de X.
          const colsX = colunas.filter((c: string) => c !== targetCol);
          lines.push(`    # ${item.label}: codifica rótulos categóricos`);
          if (colsX.length > 0) {
            for (const col of colsX) {
              lines.push(`    le_${col} = LabelEncoder()`);
              lines.push(`    X_train["${col}"] = le_${col}.fit_transform(X_train["${col}"])`);
              lines.push(`    X_test["${col}"] = le_${col}.transform(X_test["${col}"])`);
            }
          } else {
            lines.push('    # (o alvo é codificado no fluxo principal, após o split)');
          }
          break;
        }

        case 'simple_imputer':
          lines.push(`    # ${item.label}: Preenche valores ausentes`);
          lines.push(`    imputer = SimpleImputer(${this.preprocArgs(item, "strategy='mean'")})`);
          if (colsArray) {
            lines.push(`    X_train${colsIdx} = imputer.fit_transform(X_train${colsIdx})`);
            lines.push(`    X_test${colsIdx} = imputer.transform(X_test${colsIdx})`);
          } else {
            lines.push('    X_train = pd.DataFrame(imputer.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(imputer.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        case 'polynomial_features':
          lines.push(`    # ${item.label}: Gera features polinomiais`);
          lines.push(`    poly = PolynomialFeatures(${this.preprocArgs(item, 'degree=2, include_bias=False')})`);
          if (colsArray) {
            lines.push(`    X_train_poly = poly.fit_transform(X_train${colsIdx})`);
            lines.push(`    X_test_poly = poly.transform(X_test${colsIdx})`);
            lines.push(`    poly_cols = poly.get_feature_names_out(${colsArray})`);
            lines.push('    X_train_poly = pd.DataFrame(X_train_poly, columns=poly_cols, index=X_train.index)');
            lines.push('    X_test_poly = pd.DataFrame(X_test_poly, columns=poly_cols, index=X_test.index)');
            lines.push(`    X_train = pd.concat([X_train.drop(columns=${colsArray}), X_train_poly], axis=1)`);
            lines.push(`    X_test = pd.concat([X_test.drop(columns=${colsArray}), X_test_poly], axis=1)`);
          }
          break;

        case 'power_transformer':
          lines.push(`    # ${item.label}: Transformação para dados mais Gaussianos`);
          lines.push(`    pt = PowerTransformer(${this.preprocArgs(item, 'method="yeo-johnson"')})`);
          if (colsArray) {
            lines.push(`    X_train${colsIdx} = pt.fit_transform(X_train${colsIdx})`);
            lines.push(`    X_test${colsIdx} = pt.transform(X_test${colsIdx})`);
          } else {
            lines.push('    X_train = pd.DataFrame(pt.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
            lines.push('    X_test = pd.DataFrame(pt.transform(X_test), columns=X_test.columns, index=X_test.index)');
          }
          break;

        default:
          // Pré-processador registrado pelo admin: gera código a partir do execucao.
          if (item.execucao?.classe) {
            const cls = item.execucao.classe;
            const kwargs = this.execKwargs(item.execucao.hiperparametros);
            lines.push(`    # ${item.label}: ${item.resumo || cls}`);
            lines.push(`    transformer = ${cls}(${kwargs})`);
            if (colsArray) {
              lines.push(`    X_train${colsIdx} = transformer.fit_transform(X_train${colsIdx})`);
              lines.push(`    X_test${colsIdx} = transformer.transform(X_test${colsIdx})`);
            } else {
              lines.push('    X_train = pd.DataFrame(transformer.fit_transform(X_train), columns=X_train.columns, index=X_train.index)');
              lines.push('    X_test = pd.DataFrame(transformer.transform(X_test), columns=X_test.columns, index=X_test.index)');
            }
          } else {
            lines.push(`    # ${item.label}: Transformação não implementada automaticamente`);
          }
      }
    }

    lines.push('    ');
    lines.push('    return X_train, X_test');

    return lines.join('\n');
  }

  /** Args de instanciação de um pré-processador built-in: usa execucao.hiperparametros
   *  quando o admin os definiu no DB (mantém o código exportado fiel à execução),
   *  senão cai no default do template. */
  private preprocArgs(item: any, fallback: string): string {
    const h = item?.execucao?.hiperparametros;
    return Array.isArray(h) && h.length ? this.execKwargs(h) : fallback;
  }

  /** Converte hiperparâmetros do execucao ([{nome, valorPadrao}]) em kwargs Python. */
  private execKwargs(hiperparametros?: any[]): string {
    if (!Array.isArray(hiperparametros)) return '';
    return hiperparametros
      .filter(h => h && (h.nome || h.nomeHiperparametro))
      .map(h => {
        const nome = h.nome || h.nomeHiperparametro;
        const valor = h.valorPadrao !== undefined ? h.valorPadrao : h.default;
        return `${nome}=${this.pyLiteral(valor)}`;
      })
      .join(', ');
  }

  /** Serializa um valor JS como literal Python (str/bool/None/num). */
  private pyLiteral(valor: any): string {
    if (valor === null || valor === undefined) return 'None';
    if (typeof valor === 'boolean') return valor ? 'True' : 'False';
    if (typeof valor === 'number') return String(valor);
    return `"${String(valor).replace(/"/g, '\\"')}"`;
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
    lines.push('    """Configura e treina o modelo de aprendizado de máquina."""');

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

    const params = this.formatHyperparameters(hiperparametros);

    lines.push('    ');
    lines.push('    # Configuração do modelo');
    if (modelo.valor === 'regressao_polinomial') {
      // Pipeline PolynomialFeatures -> LinearRegression (espelha o backend).
      const h = hiperparametros || {};
      const py = (v: any) => v === true ? 'True' : v === false ? 'False' : v;
      const grau = h.degree ?? 2;
      const incBias = py(h.include_bias ?? true);
      const interOnly = py(h.interaction_only ?? false);
      const fitInt = py(h.fit_intercept ?? true);
      const positive = py(h.positive ?? false);
      lines.push(`    modelo = make_pipeline(`);
      lines.push(`        PolynomialFeatures(degree=${grau}, include_bias=${incBias}, interaction_only=${interOnly}),`);
      lines.push(`        LinearRegression(fit_intercept=${fitInt}, positive=${positive})`);
      lines.push(`    )`);
    } else {
      const modelClass = this.getModelClass(modelo.valor, modelo.execucao);
      lines.push(`    modelo = ${modelClass}(${params})`);
    }
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
          // As quatro de regressão. Sem elas, um pipeline de regressão exportava um
          // `avaliar_modelo` que importava as funções, imprimia o cabeçalho "MÉTRICAS DE
          // AVALIAÇÃO" e devolvia dicionário vazio — o aluno rodava e não via número nenhum.
          case 'r2_score':
            lines.push('    ');
            lines.push('    # R² (Coeficiente de Determinação)');
            lines.push('    r2 = r2_score(y_test, y_pred)');
            lines.push('    resultados["r2"] = r2');
            lines.push('    print(f"R²: {r2:.4f}")');
            break;
          case 'mean_absolute_error':
            lines.push('    ');
            lines.push('    # MAE (Erro Absoluto Médio)');
            lines.push('    mae = mean_absolute_error(y_test, y_pred)');
            lines.push('    resultados["mae"] = mae');
            lines.push('    print(f"MAE (Erro Absoluto Médio): {mae:.4f}")');
            break;
          case 'mean_squared_error':
            lines.push('    ');
            lines.push('    # MSE (Erro Quadrático Médio)');
            lines.push('    mse = mean_squared_error(y_test, y_pred)');
            lines.push('    resultados["mse"] = mse');
            lines.push('    print(f"MSE (Erro Quadrático Médio): {mse:.4f}")');
            break;
          case 'root_mean_squared_error':
            lines.push('    ');
            lines.push('    # RMSE (Raiz do Erro Quadrático Médio)');
            // Pela raiz do MSE calculado com numpy, não por `root_mean_squared_error`: a função
            // só existe no sklearn a partir da 1.4, e `np` está sempre importado — assim a linha
            // não depende de qual import o script trouxe (o caminho multi-modelo importa outro).
            lines.push('    rmse = float(np.sqrt(np.mean((np.asarray(y_test) - np.asarray(y_pred)) ** 2)))');
            lines.push('    resultados["rmse"] = rmse');
            lines.push('    print(f"RMSE (Raiz do Erro Quadrático Médio): {rmse:.4f}")');
            break;
        }
      }
    }

    lines.push('    ');
    lines.push('    return resultados');

    return lines.join('\n');
  }

  private getModelClass(modeloValor: string, execucao?: any): string {
    if (execucao?.classe) {
      return execucao.classe;
    }
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
      'pca': 'PCA',
      'sgd': 'SGDClassifier',
      'perceptron': 'Perceptron',
      'ridge': 'Ridge',
      'quantile': 'QuantileRegressor',
      'huber': 'HuberRegressor',
      'ransac': 'RANSACRegressor',
      'theilsen': 'TheilSenRegressor',
      'svr': 'SVR',
      'mlp_regressor': 'MLPRegressor',
      'knn_regressor': 'KNeighborsRegressor'
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
