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

/** Modelos não supervisionados que TRANSFORMAM em vez de agrupar: expõem `transform`, não
 *  `predict`, e não têm rótulo de grupo para medir. Espelha os `dados_rotulados: false` do
 *  catálogo que não são clusterers (`app/conteudo/modelos.json`). */
const MODELOS_DE_TRANSFORMACAO = new Set<string>(['pca']);

/** Todos os `dados_rotulados: false` do catálogo — treinam com `fit(X)`, sem alvo. */
const MODELOS_NAO_SUPERVISIONADOS = new Set<string>(['k_means', ...MODELOS_DE_TRANSFORMACAO]);

@Injectable({
  providedIn: 'root'
})
export class ScriptGeneratorService {

  constructor(private http: HttpClient, private relatorioPdf: RelatorioPdfService) { }

  /** Anexa `data/treino.csv` / `data/teste.csv` a `folder` QUANDO o script gerado vai lê-los.
   *
   *  Quem decide não é a fonte, é o SCRIPT: ele lê `data/*.csv` sempre que não souber reproduzir
   *  os dados sozinho (sem loader do sklearn, sem id do UCI, sem gerador sintético). Condicionar
   *  ao `fonteDados !== 'dataset'` deixava o zip de um dataset de exemplo não-sklearn sem CSV
   *  nenhum, com o script morrendo em FileNotFoundError.
   *
   *  Público porque há DOIS montadores de zip: o `generatePipelineBundle` daqui e o `exportar()`
   *  da Trilha. A Trilha não anexava CSV nenhum, então todo pipeline dela sobre dados do aluno
   *  (upload de planilha ou ingestão por URL) exportava um script que morria na primeira linha
   *  em `FileNotFoundError: data/treino.csv`. */
  anexarDadosCsv(folder: JSZip, coleta: ResultadoColetaDado | undefined): void {
    if (!this.scriptLeCsv(coleta)) return;
    if (coleta?.treino?.dados?.length) {
      folder.file('data/treino.csv', this.convertToCsv(coleta.treino.dados));
    }
    if (coleta?.teste?.dados?.length) {
      folder.file('data/teste.csv', this.convertToCsv(coleta.teste.dados));
    }
  }

  /** O zip do modelo veio no formato MLflow? (é a presença do arquivo `MLmodel`)
   *
   *  O servidor tem DOIS caminhos: com MLflow ligado manda a pasta `model/` completa
   *  (`MLmodel`, `model.pkl`, `requirements.txt` já com `mlflow==…`); no fallback manda só
   *  `model.pkl` + um requirements fixo SEM mlflow. `mlflow.sklearn.load_model()` precisa do
   *  `MLmodel`, então no fallback o `usar_modelo_mlflow.py` falharia sempre — e é por isso que
   *  ele não vai no pacote nesse caso. Puro de propósito: a decisão fica testável sem HTTP. */
  temFormatoMlflow(nomes: string[]): boolean {
    return nomes.some((n) => n.split('/').pop() === 'MLmodel');
  }

  /** Baixa o modelo treinado (id) e o mescla no bundle sob `<subpasta>/modelo/`,
   *  escrevendo também os exemplos de uso.
   *  Best-effort: se o download falhar (modelo indisponível), o bundle segue sem o modelo.
   *
   *  Devolve `true` quando o formato MLflow veio — o README precisa saber, para não prometer
   *  um `usar_modelo_mlflow.py` que não está lá. */
  async anexarModeloTreinado(
    folder: JSZip, entry: any, coleta: ResultadoColetaDado | undefined, subpasta?: string,
  ): Promise<boolean> {
    if (!entry?.id) return false;
    try {
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiUrl}classificador/modelo/${entry.id}/artefato`, { responseType: 'blob' })
      );
      const dest = subpasta ? folder.folder(subpasta)! : folder;
      const modeloDir = dest.folder('modelo')!;
      const zipModelo = await JSZip.loadAsync(blob as Blob);
      const comMlflow = this.temFormatoMlflow(Object.keys(zipModelo.files));
      for (const nome of Object.keys(zipModelo.files)) {
        const f = zipModelo.files[nome];
        if (f.dir) continue;
        // `environment_variables.txt` do MLflow lista as variáveis de ambiente do SERVIDOR de
        // treino (inclusive `NVIDIA_API_KEY`). Só o nome, nunca o valor — mas isso vai num zip
        // que o aluno baixa e repassa, e nenhum dos `usar_modelo_*.py` usa variável de ambiente.
        if (nome.split('/').pop() === 'environment_variables.txt') continue;
        modeloDir.file(nome, await f.async('uint8array'));
      }
      // O joblib sempre: `model.pkl` existe nos dois caminhos do servidor.
      if (comMlflow) {
        dest.file('usar_modelo_mlflow.py', this.gerarUsarModeloMlflow(entry, coleta));
      }
      dest.file('usar_modelo_joblib.py', this.gerarUsarModeloJoblib(entry, coleta));
      return comMlflow;
    } catch (erro: any) {
      // Best-effort de propósito (o `pipeline.py` treina do zero e não depende da pasta), mas o
      // `catch {}` mudo de antes escondia POR QUE a pasta não veio: a ausência do `modelo/` no zip
      // de agrupamento ficou três registros de histórico como "observação não investigada", sem
      // ninguém conseguir dizer se era 404 de dono, MLflow desligado ou rede. Agora o motivo sai no
      // console e uma nota vai dentro do próprio zip, onde quem baixou consegue ler.
      const motivo = erro?.status ? `HTTP ${erro.status}` : (erro?.message || 'motivo desconhecido');
      console.warn(`[H2IA] modelo treinado não foi anexado ao zip (${motivo}).`, erro);
      try {
        const dest = subpasta ? folder.folder(subpasta)! : folder;
        dest.file('MODELO-AUSENTE.txt', [
          'O modelo já treinado não pôde ser anexado a este pacote.',
          `Motivo: ${motivo}.`,
          '',
          'Isso NÃO afeta o `pipeline.py`: ele treina o modelo do zero a partir dos dados.',
          'Falta apenas o atalho de reusar o modelo já treinado (`usar_modelo_*.py`).',
          '',
          'Causas comuns: o modelo foi treinado por outra conta (o download é escopado ao dono),',
          'o registro foi apagado do servidor, ou houve falha de rede durante a exportação.',
        ].join('\n'));
      } catch { /* nem a nota deu: o zip segue sem ela */ }
      return false;
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
      'O modelo está na pasta ./modelo (formato MLflow). Um comando basta: o',
      'requirements.txt do MLflow já traz o próprio mlflow, junto das MESMAS versões do',
      'treino (pickle é sensível à versão do scikit-learn).',
      '    pip install -r modelo/requirements.txt',
      '',
      'Precisa de Python 3.10 ou mais novo (exigência do mlflow). Não quer instalar o',
      'MLflow? Use o usar_modelo_joblib.py, que carrega o mesmo modelo e pede menos.',
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
      '',
      'Precisa de Python 3.9 ou mais novo (exigência do scikit-learn 1.4).',
      '"""',
      'import joblib',
      'import pandas as pd',
      '',
      'modelo = joblib.load("modelo/model.pkl")',
      '',
      ...this.corpoPrevisao(entry, coleta),
    ].join('\n');
  }

  /** Cabeçalho do script gerado: título, data e COMO EXECUTAR.
   *
   *  A instrução de execução vive no README, mas o aluno abre o `.py` sozinho no editor — e aí o
   *  README fica para trás. Repetir aqui as três linhas custa nada e é onde ele está olhando. */
  private cabecalhoScript(titulo: string, extras: string[] = []): string[] {
    return [
      '#!/usr/bin/env python3',
      '# -*- coding: utf-8 -*-',
      '"""',
      titulo,
      'Data: ' + new Date().toLocaleDateString('pt-BR'),
      ...extras,
      '',
      'Como executar (Python 3.9+):',
      '    python3 -m venv .venv && source .venv/bin/activate   # Windows: py -m venv .venv',
      '    pip install pandas numpy scikit-learn',
      '    python ' + 'pipeline.py',
      '',
      'Este script TREINA o modelo do zero a partir dos dados e imprime as métricas no',
      'terminal. Ele não usa a pasta modelo/ (o modelo já treinado) e não grava arquivos.',
      '"""',
      '',
    ];
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

    // Os ajustes do aluno vêm do PRÓPRIO TREINO quando o chamador não os passa — e nenhum
    // chamador passa (a Área de Trabalho manda `{}`). Sem isto, ajustar `n_neighbors` na tela,
    // treinar e exportar dava um script com a classe no default: outro modelo, outra métrica.
    const hiperEfetivos = Object.keys(hiperparametros || {}).length
      ? hiperparametros
      : this.hiperparametrosDoTreino(modelosTreinados[0]);

    const script = isMultiModelo
      ? this.generateMultiModelScript(resultadoColetaDado, modelosTreinados, metricasSelecionadas, preProcessamentoConfig)
      : this.generatePythonScript(resultadoColetaDado, modeloSelecionado, metricasSelecionadas, hiperEfetivos, preProcessamentoConfig);

    folder.file('pipeline.py', script);

    this.anexarDadosCsv(folder, resultadoColetaDado);

    // Modelo(s) já treinado(s) + os exemplos de uso (best-effort; requer que o modelo ainda
    // exista no backend). Single: `modelo/` na raiz; multi: `modelos/<nome>/`.
    let temMlflow = false;
    for (const entry of modelosTreinados) {
      const subpasta = isMultiModelo ? `modelos/${slugificarNome(entry?.nome_modelo) || 'modelo'}` : undefined;
      temMlflow = (await this.anexarModeloTreinado(folder, entry, resultadoColetaDado, subpasta)) || temMlflow;
    }

    // O README vem DEPOIS do anexo de propósito: só aqui se sabe se o formato MLflow veio, e
    // prometer um `usar_modelo_mlflow.py` que não está no zip mandaria o aluno rodar um arquivo
    // inexistente. Antes ele era escrito antes do laço e afirmava "formato MLflow" sempre.
    folder.file('README.md', this.generateReadme(
      modeloSelecionado, resultadoColetaDado, isMultiModelo ? modelosTreinados : undefined,
      modelosTreinados.length > 0, temMlflow, metricasSelecionadas));

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

    lines.push(...this.cabecalhoScript(
      'Comparação de Modelos de Aprendizado de Máquina — gerado pelo H2IA Tutor',
      ['Modelos: ' + modelosTreinados.map(m => m.nome_modelo).join(', ')]));

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
    // Espelha o catálogo (`dados_rotulados: false`), não uma lista solta: a antiga citava
    // `dbscan` e `agglomerative`, que não existem no catálogo, e deixava o `pca` de fora — daí o
    // script de comparação chamar `predict` num PCA.
    const ehNaoSupervisionado = (m: any) => MODELOS_NAO_SUPERVISIONADOS.has(m?.modelo ?? '');

    // Uma comparação mistura os dois tipos quando o aluno treina, na MESMA coleta, um modelo
    // supervisionado e um k-Means (o acumulado de `resultadoTreinamento` guarda os dois). O laço
    // aplicava o mesmo `fit` a todos e estourava `fit() missing 1 required argument: 'y'`. E não
    // haveria o que comparar: acurácia e silhueta medem coisas diferentes. Então o script leva os
    // modelos da tarefa da COLETA e diz, em comentário, quais ficaram de fora.
    const semAlvo = !resultadoColetaDado?.target || resultadoColetaDado?.dadosRotulados === false;
    const compativeis = modelosTreinados.filter(m => ehNaoSupervisionado(m) === semAlvo);
    const usados = compativeis.length ? compativeis : modelosTreinados;
    const deixadosDeFora = modelosTreinados.filter(m => !usados.includes(m));
    modelosTreinados = usados;

    const isClustering = modelosTreinados.some(ehNaoSupervisionado);

    // Data loading
    lines.push(this.generateDataLoadingFunction(resultadoColetaDado));
    lines.push('');
    lines.push(this.generateFeatureSelectionFunction(resultadoColetaDado, isClustering));
    lines.push('');
    lines.push(this.generatePreprocessingFunction(resultadoColetaDado, preProcessamentoConfig));
    lines.push('');
    lines.push(this.generateEvaluationFunction(metricasSelecionadas, isClustering));
    lines.push('');

    // Dict with all models
    lines.push('# ============================================');
    lines.push('# Dicionário com todos os modelos a comparar');
    lines.push('# ============================================');
    if (deixadosDeFora.length) {
      lines.push('# Fora desta comparação, por serem de outro tipo de tarefa (não há como comparar');
      lines.push('# acurácia com silhueta): ' + deixadosDeFora.map(m => m.nome_modelo).join(', '));
      lines.push('# Exporte-os a partir de um pipeline do tipo correspondente.');
    }
    lines.push('MODELOS = {');
    for (const m of modelosTreinados) {
      const cls = this.getModelClass(m.modelo ?? '', m.execucao);
      // Cada ramo da comparação tem os SEUS ajustes (é o ponto de comparar dois modelos com
      // configurações diferentes). Instanciar tudo no default apagava justamente a diferença.
      const doAluno = this.hiperparametrosDoTreino(m);
      const fixos = this.hiperparametrosFixosDoServidor(m.modelo ?? '', doAluno);
      const params = [fixos, this.formatHyperparameters(doAluno)].filter(p => p).join(', ');
      lines.push(`    "${m.nome_modelo}": ${cls}(${params}),`);
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

  /** De onde o SCRIPT tira os dados, em uma frase. Espelha o despacho de
   *  `generateDataLoadingFunction` — as quatro saídas possíveis, na mesma ordem. */
  private descreverOrigem(resultado: ResultadoColetaDado | undefined): string {
    if (resultado?.fonteDados !== 'dataset' || !resultado.nomeDataset) {
      const nome = resultado?.treino?.nomeArquivo;
      return nome ? `Arquivo enviado por você (\`${nome}\`), incluído em \`data/\``
                  : 'Arquivos CSV incluídos em `data/`';
    }
    const chave = resultado.datasetId ?? resultado.nomeDataset;
    if (this.getToyDatasetLoader(chave)) {
      return `Dataset de exemplo '${resultado.nomeDataset}' do scikit-learn (carregado via \`as_frame=True\`)`;
    }
    const uciId = this.getUciDatasetId(chave);
    if (uciId !== null) {
      return `Dataset '${resultado.nomeDataset}' do UCI Machine Learning Repository (baixado com \`fetch_ucirepo(id=${uciId})\`)`;
    }
    if (this.getGeradorSintetico(chave, resultado.datasetSeed)) {
      return `Dataset sintético '${resultado.nomeDataset}', GERADO pelo próprio script (mesma semente da plataforma)`;
    }
    return `Dataset de exemplo '${resultado.nomeDataset}', com os dados incluídos em \`data/\``;
  }

  /** `temMlflow`: o zip do modelo trouxe o formato MLflow (ver `temFormatoMlflow`). Sem ele o
   *  README não pode oferecer o caminho do MLflow — o arquivo não vai no pacote.
   *  `metricas`: só para dizer ao aluno o que o script imprime. */
  private generateReadme(modelo: ItemPipeline | undefined, resultado: ResultadoColetaDado | undefined,
                         modelosTreinados?: any[], temModelo = false, temMlflow = false,
                         metricas: ItemPipeline[] = []): string {
    const lines: string[] = [];
    // No modo comparação o zip põe cada modelo em `modelos/<slug>/` (ver `anexarModeloTreinado`),
    // então a árvore e os comandos precisam desse prefixo. Sem isto o README mandava rodar
    // `python usar_modelo_joblib.py` num arquivo que não existe na raiz.
    const isMulti = !!modelosTreinados && modelosTreinados.length > 1;
    const prefixoModelo = isMulti ? 'modelos/<nome-do-modelo>/' : '';

    lines.push('# Pipeline de Aprendizado de Máquina - H2IA Tutor');
    lines.push('');
    lines.push('## Estrutura do Projeto');
    lines.push('');
    lines.push('```');
    lines.push('pipeline_iana/');
    lines.push('├── pipeline.py          # Script principal do pipeline');
    // Os CSVs entram no zip quando o SCRIPT vai lê-los, não quando a fonte é upload — a árvore
    // segue a mesma regra do anexo (`scriptLeCsv`), senão anuncia arquivos que não existem
    // (ou omite os que existem, no caso de um dataset de exemplo sem loader conhecido).
    if (this.scriptLeCsv(resultado)) {
      lines.push('├── data/');
      if (resultado?.treino?.dados?.length) {
        lines.push('│   ├── treino.csv       # Dados de treino');
      }
      if (resultado?.teste?.dados?.length) {
        lines.push('│   └── teste.csv        # Dados de teste');
      }
    }
    if (temModelo) {
      lines.push(`├── ${prefixoModelo}modelo/              # Modelo JÁ treinado ${temMlflow ? '(formato MLflow)' : '(model.pkl)'}`);
      if (temMlflow) {
        lines.push(`├── ${prefixoModelo}usar_modelo_mlflow.py # Carrega o modelo via MLflow e faz uma previsão`);
      }
      lines.push(`├── ${prefixoModelo}usar_modelo_joblib.py # Carrega o modelo via joblib e faz uma previsão`);
    }
    lines.push('├── hub-ia.pdf           # Conheça o Hub de Inovação em IA (ia.ufpel.edu.br)');
    lines.push('└── README.md            # Este arquivo');
    lines.push('```');
    lines.push('');
    lines.push('## Como Executar');
    lines.push('');
    // "3.7+" era falso: as versões que o modelo treinado fixa (scikit-learn 1.4, pandas 2.2,
    // numpy 1.26) exigem >=3.9, e o mlflow, >=3.10. Seguir o README à risca no 3.7 dava erro de
    // resolução do pip.
    lines.push('**1. Python 3.9 ou mais novo.** Confira com `python --version`'
      + ' (no Windows, `py --version`).');
    lines.push('');
    lines.push('**2. Crie um ambiente virtual** dentro desta pasta. Ele isola as versões deste');
    lines.push('pipeline das de outros trabalhos — sem isso, instalar aqui pode quebrar outro');
    lines.push('projeto seu.');
    lines.push('');
    lines.push('```bash');
    lines.push('# Linux / macOS');
    lines.push('python3 -m venv .venv');
    lines.push('source .venv/bin/activate');
    lines.push('');
    lines.push('# Windows (PowerShell)');
    lines.push('py -m venv .venv');
    lines.push('.venv\\Scripts\\Activate.ps1');
    lines.push('```');
    lines.push('');
    lines.push('O nome do ambiente aparece no início da linha do terminal: `(.venv)`.');
    lines.push('');
    lines.push('**3. Instale as dependências:**');
    lines.push('');
    lines.push('```bash');
    // `ucimlrepo` é obrigatório quando o script baixa do UCI — sem ela o aluno segue o README à
    // risca e recebe `ModuleNotFoundError: No module named 'ucimlrepo'`.
    const precisaUci = resultado?.fonteDados === 'dataset'
      && this.getUciDatasetId(resultado.datasetId ?? resultado.nomeDataset ?? '') !== null;
    lines.push(`pip install pandas numpy scikit-learn${precisaUci ? ' ucimlrepo' : ''}`);
    lines.push('```');
    lines.push('');
    lines.push('**4. Execute:**');
    lines.push('');
    lines.push('```bash');
    lines.push('python pipeline.py');
    lines.push('```');
    lines.push('');
    lines.push('### O que esperar');
    lines.push('');
    lines.push('O `pipeline.py` **treina o modelo do zero** a partir dos dados — ele não usa a');
    lines.push('pasta `modelo/`, então dá para alterá-lo à vontade e treinar de novo.');
    const nomesMetricas = (metricas || []).map((m) => m?.label).filter(Boolean);
    lines.push(nomesMetricas.length
      ? `Ele imprime no terminal as métricas que você escolheu (${nomesMetricas.join(', ')}).`
      : 'Ele imprime os resultados no terminal.');
    lines.push('**Não grava arquivo nenhum.** Para guardar a saída:');
    lines.push('');
    lines.push('```bash');
    lines.push('python pipeline.py > resultado.txt');
    lines.push('```');
    lines.push('');
    lines.push('Em bases pequenas o treino leva segundos. Se demorar muito mais, quase sempre é');
    lines.push('download de dados, não o treino.');
    lines.push('');
    if (temModelo) {
      lines.push('### Re-treinar ou reusar o modelo?');
      lines.push('');
      lines.push('São coisas diferentes, e o pacote traz as duas:');
      lines.push('');
      lines.push('- **`pipeline.py`** — treina de novo, do zero. Use para estudar o pipeline,');
      lines.push('  mudar hiperparâmetros ou trocar o modelo e ver o efeito.');
      lines.push('- **`usar_modelo_*.py`** — carrega o modelo que você **já treinou** na');
      lines.push('  plataforma (pasta `modelo/`) e só faz a previsão. Use para aplicar o modelo a');
      lines.push('  um exemplo novo, sem re-treinar e sem depender dos CSVs.');
      lines.push('');
    }
    if (temModelo) {
      lines.push('## Como usar o modelo JÁ treinado (sem re-treinar)');
      lines.push('');
      if (temMlflow) {
        lines.push('A pasta `modelo/` contém o modelo salvo no formato MLflow (com `MLmodel`,');
        lines.push('`model.pkl` e `requirements.txt`). Há DUAS formas de usá-lo:');
      } else {
        lines.push('A pasta `modelo/` contém o modelo salvo (`model.pkl`) e o `requirements.txt`');
        lines.push('com as versões do treino.');
      }
      lines.push('');
      lines.push('```bash');
      if (isMulti) {
        lines.push('# Cada modelo comparado tem a sua pasta; entre na do modelo que quer usar:');
        lines.push('cd modelos/<nome-do-modelo>');
        lines.push('');
      }
      // Um comando só: o requirements.txt escrito pelo MLflow começa com `mlflow==<versão>`, então
      // um `pip install mlflow` depois dele seria repetição — e sugeriria que falta alguma coisa.
      lines.push('pip install -r modelo/requirements.txt   # mesmas versões do treino');
      lines.push('');
      if (temMlflow) {
        lines.push('# Opção 1 — via joblib (mais simples, sem dependência extra):');
        lines.push('python usar_modelo_joblib.py');
        lines.push('');
        lines.push('# Opção 2 — via MLflow (usa os metadados do formato MLmodel):');
        lines.push('python usar_modelo_mlflow.py');
      } else {
        lines.push('python usar_modelo_joblib.py');
      }
      lines.push('```');
      lines.push('');
      lines.push('> Edite os valores de exemplo nos `usar_modelo_*.py` para os seus dados.');
      if (isMulti) {
        lines.push('> Os caminhos acima são relativos à pasta do modelo — rode de dentro dela.');
      }
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
      // A origem vem do MESMO despacho de `generateDataLoadingFunction`, senão o README afirma
      // "toy dataset do scikit-learn" para um dataset do UCI (que o script baixa com
      // `fetch_ucirepo`) ou para um sintético (que o script GERA).
      lines.push(`- **Origem:** ${this.descreverOrigem(resultado)}`);
      // Em agrupamento não há alvo: a linha saía como "- **Target:** " sem valor nenhum.
      if (resultado.target) {
        lines.push(`- **Target:** ${resultado.target}`);
      }
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

    lines.push(...this.cabecalhoScript('Pipeline de Aprendizado de Máquina gerado pelo H2IA Tutor'));

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
    lines.push(this.generateEvaluationFunction(metricasSelecionadas, isClustering, modeloSelecionado?.valor));
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
      // O PCA não vive em `sklearn.preprocessing` (é `decomposition`), então tem import próprio.
      if (itens.some(i => i.valor === 'pca')) {
        imports.push('from sklearn.decomposition import PCA');
      }
      for (const item of itens) {
        if (!PRE_PROC_BUILTINS.has(item.valor) && item.valor !== 'pca'
            && item.execucao?.modulo && item.execucao?.classe) {
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
      // `SVC`, não `LinearSVC`: o servidor treina `SVC(kernel="linear")`
      // (`app/routers/svm_linear.py`). São formulações diferentes e dão resultados diferentes —
      // medido no Wine: 0.9556 com SVC(kernel=linear) contra 0.9778 com LinearSVC.
      'svm_linear': 'from sklearn.svm import SVC',
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
          ...(ds.colunas
            ? ['    # O MESMO recorte que a plataforma oferece. As colunas de fora não são',
               '    # "a menos": `boat` e `body` (bote salva-vidas / corpo recuperado) revelam a',
               '    # resposta, e treinar com elas daria um acerto quase perfeito e enganoso.',
               `    X = X[[${ds.colunas.map(c => `"${c}"`).join(', ')}]]`]
            : []),
          ...(ds.rotulosDeClasse
            ? ['    # O alvo pelo NOME da classe, como a plataforma mostra — assim a matriz de',
               '    # confusão sai com os mesmos rótulos, e na mesma ordem, da que você viu na tela.',
               '    y = dados.target.map(dict(enumerate(dados.target_names)))']
            : ['    y = dados.target']),
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
          // `data.original`, e não `data.features`/`data.targets`: é a MESMA fonte que o servidor
          // usa (`app/models/dataset_loaders.py:172`). Com `features`, a coluna que o UCI declara
          // como alvo fica de fora do dataframe — e a tela, que lista as colunas de `original`,
          // deixa o aluno marcá-la como atributo. O script então cobrava uma coluna que não
          // existia: `KeyError: "['color'] not in index"` em 5 datasets. E o alvo saía do que o
          // UCI declara, ignorando o que o aluno escolheu na tela.
          '    df = dados.data.original',
          ...(resultado.target
            ? [`    y = df["${resultado.target}"]`,
               `    X = df.drop(columns=["${resultado.target}"])`]
            : ['    y = None',
               '    X = df']),
          '    ',
          '    print("Primeiras amostras (X):")',
          '    print(X.head())',
          '    print(f"Shape de X: {X.shape}")',
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

  /** `rotulosDeClasse`: o servidor troca o alvo numérico pelo NOME da classe nesses datasets
   *  (`app/routers/toy_datasets.py`), então o script faz o mesmo — senão a matriz de confusão do
   *  aluno sai com `0/1/2` onde a tela mostra `setosa/versicolor/virginica`, e no breast_cancer
   *  a ordem chega a inverter (o sklearn usa `0=malignant`, a tela ordena alfabeticamente), o que
   *  dá uma matriz transposta em relação à da plataforma. */
  /** Espelha `carregar_sklearn` e `OPENML_SPECS` do backend (`app/models/dataset_loaders.py`).
   *
   *  `colunas` é o recorte que a plataforma oferece: quando existe, o script tem de aplicar o
   *  MESMO recorte, senão treina com colunas que a tela nunca mostrou. No Titanic isso é
   *  crítico — `boat` e `body` são vazamento (bote salva-vidas / corpo recuperado) e levariam o
   *  script a ~100% de acerto contra os ~80% da tela. */
  private getToyDatasetLoader(
    nome: string,
  ): { importLine: string; rotulosDeClasse?: boolean; colunas?: string[] } | null {
    const map: Record<string, { importLine: string; rotulosDeClasse?: boolean; colunas?: string[] }> = {
      'iris': { importLine: 'load_iris(as_frame=True)', rotulosDeClasse: true },
      'wine': { importLine: 'load_wine(as_frame=True)', rotulosDeClasse: true },
      'breast_cancer': { importLine: 'load_breast_cancer(as_frame=True)', rotulosDeClasse: true },
      'digits': { importLine: 'load_digits(as_frame=True)', rotulosDeClasse: true },
      'diabetes': { importLine: 'load_diabetes(as_frame=True)' },
      'california_housing': { importLine: 'fetch_california_housing(as_frame=True)' },
      // Sem `colunas`: o Titanic entrega as 13 do OpenML, como a plataforma (`OPENML_SPECS` com
      // `colunas: None`) — inclusive `boat`/`body`, que são vazamento e estão expostas de
      // propósito, para ensinar. Quem recorta é a seleção de atributos do aluno.
      // O alvo já vem como rótulo ('0'/'1'), então NÃO passa pelo mapa de `target_names`.
      'titanic': { importLine: 'fetch_openml("titanic", version=1, as_frame=True)' },
    };
    return map[nome] ?? null;
  }

  // Espelha o mapa UCI_IDS do backend (app/models/dataset_loaders.py).
  private getUciDatasetId(nome: string): number | null {
    const map: Record<string, number> = {
      'adult': 2,
      'wine_quality': 186,
      'heart_disease': 45,
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

        case 'pca':
          // PCA REDUZ o número de colunas, então não dá para atribuir o resultado de volta às
          // colunas de origem. Sem este `case` o item caía no `default` sem `execucao` e o script
          // saía com um comentário "não implementada" — rodava, mas treinando sobre as features
          // cruas enquanto o servidor aplicou PCA (divergência silenciosa, pior que um erro).
          lines.push(`    # ${item.label}: Redução de dimensionalidade`);
          lines.push(`    pca = PCA(${this.preprocArgs(item, 'n_components=2')})`);
          lines.push(...this.linhasTransformadorLarguraVariavel('pca', colsArray));
          break;

        default:
          // Pré-processador registrado pelo admin: gera código a partir do execucao.
          if (item.execucao?.classe) {
            const cls = item.execucao.classe;
            const kwargs = this.execKwargs(item.execucao.hiperparametros);
            lines.push(`    # ${item.label}: ${item.resumo || cls}`);
            lines.push(`    transformer = ${cls}(${kwargs})`);
            // Não presumir que a largura de X continua a mesma: o admin pode cadastrar um
            // PCA, um SelectKBest, um TruncatedSVD. Reconstruir o DataFrame com
            // `columns=X_train.columns` estourava `Shape of passed values`, e atribuir de volta
            // ao indexador estourava `Columns must be same length as key` — com o agravante de
            // que o servidor treina sem problema (monta um `sklearn.Pipeline` de verdade), então
            // era a plataforma dando o número e o script exportado morrendo.
            lines.push(...this.linhasTransformadorLarguraVariavel('transformer', colsArray));
          } else {
            lines.push(`    # ${item.label}: Transformação não implementada automaticamente`);
          }
      }
    }

    lines.push('    ');
    lines.push('    return X_train, X_test');

    return lines.join('\n');
  }

  /** Linhas que aplicam um transformador que PODE mudar o número de colunas (PCA, SelectKBest,
   *  TruncatedSVD…), sem presumir a largura de X.
   *
   *  Os nomes das colunas novas saem de `get_feature_names_out()` quando o transformador o
   *  oferece — o que preserva os nomes originais nos que são 1-para-1 e dá nomes próprios
   *  (`pca0`, `pca1`…) nos que reduzem. O `try/except` existe porque transformadores antigos ou
   *  de terceiros podem não ter o método.
   *
   *  @param nomeVar nome da variável Python que guarda o transformador já instanciado
   *  @param colsArray lista de colunas em que aplicar (`["a", "b"]`), ou `null` para X inteiro */
  private linhasTransformadorLarguraVariavel(nomeVar: string, colsArray: string | null): string[] {
    const nomesGerados = (fonte: string) => [
      `    try:`,
      `        _cols = list(${nomeVar}.get_feature_names_out(${fonte}))`,
      `    except Exception:`,
      `        _cols = [f"${nomeVar}_{i}" for i in range(_arr.shape[1])]`,
    ];

    if (!colsArray) {
      return [
        `    _arr = ${nomeVar}.fit_transform(X_train)`,
        ...nomesGerados(''),
        `    X_train = pd.DataFrame(_arr, columns=_cols, index=X_train.index)`,
        `    _arr = ${nomeVar}.transform(X_test)`,
        `    X_test = pd.DataFrame(_arr, columns=_cols, index=X_test.index)`,
      ];
    }
    // Mesmo padrão do `polynomial_features`: descarta as colunas de origem e concatena as novas.
    return [
      `    _arr = ${nomeVar}.fit_transform(X_train[${colsArray}])`,
      ...nomesGerados(colsArray),
      `    X_train = pd.concat([X_train.drop(columns=${colsArray}),`,
      `                         pd.DataFrame(_arr, columns=_cols, index=X_train.index)], axis=1)`,
      `    _arr = ${nomeVar}.transform(X_test[${colsArray}])`,
      `    X_test = pd.concat([X_test.drop(columns=${colsArray}),`,
      `                        pd.DataFrame(_arr, columns=_cols, index=X_test.index)], axis=1)`,
    ];
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
      // Os ajustes que o SERVIDOR fixa entram aqui, senão o script treina outra configuração.
      const fixos = this.hiperparametrosFixosDoServidor(modelo.valor, hiperparametros);
      const todos = [fixos, params].filter(p => p).join(', ');
      lines.push(`    modelo = ${modelClass}(${todos})`);
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

  /** Os hiperparâmetros COM QUE O MODELO FOI TREINADO, na forma que o script deve reproduzir.
   *
   *  A resposta do treino traz dois dicionários: `hiperparametros` (o `get_params()` do estimador
   *  final, com dezenas de chaves) e `hiperparametros_padrao` (só as que o catálogo expõe, que são
   *  as que o aluno vê e ajusta). Emitir o primeiro inteiro encheria o script de ruído
   *  (`algorithm='auto'`, `leaf_size=30`…), então cruzamos os dois: as CHAVES do catálogo com os
   *  VALORES efetivos do treino. Assim o script mostra o que o aluno mexeu, e só isso. */
  private hiperparametrosDoTreino(resultado: any): any {
    const efetivos = resultado?.hiperparametros;
    const expostos = resultado?.hiperparametros_padrao;
    if (!efetivos || !expostos) return {};
    const saida: Record<string, any> = {};
    for (const chave of Object.keys(expostos)) {
      if (efetivos[chave] !== undefined) saida[chave] = efetivos[chave];
    }
    return saida;
  }

  /** Ajustes que o ROUTER do backend passa fixos ao treinar, e que o aluno não vê na tela.
   *
   *  Espelha os `kwargs` literais de `app/routers/<modelo>.py` (o 4º argumento de
   *  `treinar_modelo_generico`). Sem isto o script exportado instanciava a classe no default e
   *  treinava outra configuração: o `svm_linear` é `SVC(kernel="linear")` no servidor, e o MLP
   *  batia no teto de 200 iterações onde o servidor usa 500 (medido: converge em 267).
   *  Um valor escolhido pelo aluno para o mesmo parâmetro tem precedência — por isso a
   *  chave já presente em `hiperparametros` é omitida aqui.
   *
   *  **Ao mudar um `kwargs` fixo num router do backend, ajuste este mapa.** */
  private hiperparametrosFixosDoServidor(valor: string, hiperparametros: any): string {
    const fixos: Record<string, Record<string, string | number>> = {
      'svm_linear': { kernel: '"linear"' },
      'mlp': { max_iter: 500 },
      'regressao_logistica': { max_iter: 1000 },
    };
    const doModelo = fixos[valor];
    if (!doModelo) return '';
    const escolhidos = hiperparametros || {};
    return Object.entries(doModelo)
      .filter(([chave]) => escolhidos[chave] === undefined || escolhidos[chave] === null)
      .map(([chave, v]) => `${chave}=${v}`)
      .join(', ');
  }

  /** @param ehAgrupamento decidido pelo MODELO (fonte única). Quando não informado, cai na
   *  inferência pelas métricas — que era a fonte antiga e discordava do resto do script: o corpo
   *  chamava `avaliar_modelo(modelo, X_test)` e a definição saía `(modelo, X_test, y_test)`,
   *  `TypeError` na cara do aluno. Acontecia com agrupamento sem métrica de agrupamento
   *  selecionada — o caso NOMINAL do PCA, cujo `metricas` é `[]` no catálogo. */
  private generateEvaluationFunction(
    metricas: ItemPipeline[], ehAgrupamento?: boolean, valorModelo?: string,
  ): string {
    const isClustering = ehAgrupamento ?? metricas.some(m =>
      ['silhouette_score', 'calinski_harabasz_score', 'davies_bouldin_score'].includes(m.valor)
    );

    const lines: string[] = [];
    lines.push('# ============================================');
    lines.push('# Função: Avaliação do Modelo');
    lines.push('# ============================================');

    // O PCA é não supervisionado mas NÃO é agrupamento: ele tem `transform`, não `predict`, e
    // `modelo.predict(X_test)` estourava `AttributeError`. Aqui a avaliação que faz sentido é a
    // variância explicada — que é também o que a plataforma mostra, porque o servidor recusa
    // métrica de agrupamento para o PCA (guarda em `app/metricas/metricas.py`).
    if (isClustering && MODELOS_DE_TRANSFORMACAO.has(valorModelo ?? '')) {
      lines.push('def avaliar_modelo(modelo, X_test):');
      lines.push('    """O PCA transforma os dados: avaliamos quanta informação as componentes guardam."""');
      lines.push('    ');
      lines.push('    X_reduzido = modelo.transform(X_test)');
      lines.push('    ');
      lines.push('    print("\\n" + "=" * 50)');
      lines.push('    print("RESULTADO DA REDUÇÃO DE DIMENSIONALIDADE")');
      lines.push('    print("=" * 50)');
      lines.push('    print(f"Colunas antes: {X_test.shape[1]} | depois: {X_reduzido.shape[1]}")');
      lines.push('    ');
      lines.push('    razoes = modelo.explained_variance_ratio_');
      lines.push('    for i, r in enumerate(razoes, start=1):');
      lines.push('        print(f"Componente {i}: explica {r:.2%} da variação dos dados")');
      lines.push('    total = float(razoes.sum())');
      lines.push('    print(f"As componentes juntas guardam {total:.2%} da informação original")');
      lines.push('    ');
      lines.push('    return {"variancia_explicada_total": total}');
      return lines.join('\n');
    }

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
      // SVC com kernel linear (ver o import acima e `hiperparametrosFixosDoServidor`).
      'svm_linear': 'SVC',
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
      // `null` é pulado (e não emitido como `None`) para o default da classe valer.
      if (value === null || value === undefined) continue;
      // `pyLiteral` e não interpolação direta: `String(true)` é `"true"`, que em Python é um
      // nome inexistente (`NameError: name 'true' is not defined`). Qualquer modelo com
      // hiperparâmetro booleano — `shrinking`, `fit_intercept`, `early_stopping`, `warm_start`,
      // `copy_X`, `positive`, `whiten` — gerava um script que nem chegava a treinar.
      params.push(`${key}=${this.pyLiteral(value)}`);
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
