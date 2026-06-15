import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ItemPipeline, TipoTarget } from '../../models/item-coleta-dado.model';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import itensPipeline from '../../../app/constants/itens-coletas-dados.json'

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private proximaEtapaPipe = new Subject<any>();
  proximaEtapaPipe$ = this.proximaEtapaPipe.asObservable();

  private infoItemClicked = new Subject<ItemPipeline>();
  infoItemClicked$ = this.infoItemClicked.asObservable();

  // todosItensColetasDados = itensPipeline.itensColetasDados as ItemPipeline[];
  // todosModelos = itensPipeline.itensTreino as ItemPipeline[];
  // todosItensMetricas = itensPipeline.itensMetricas as any[];

  private itemsEmExecucao = new BehaviorSubject<ItemPipeline[]>([]);
  private itensColetasDados = new BehaviorSubject<ItemPipeline[]>([]);
  private itensPreProcessamento = new BehaviorSubject<ItemPipeline[]>([]);
  private itensModelos = new BehaviorSubject<ItemPipeline[]>([]);
  private itensMetricas = new BehaviorSubject<ItemPipeline[]>([]);
  private datasetEmExecucao: ItemPipeline | null = null;
  private readonly itemDados: ItemPipeline = {
    label: 'Dados',
    movido: false,
    tipoItem: 'coleta-dado',
    habilitado: true,
    valor: 'dados',
    id: 'dados',
    icon: 'coleta-dado',
    preverCategoria: false,
    dadosRotulados: false,
    resumo: 'Carregue arquivos CSV, TSV, JSON, Excel (.xls/.xlsx) ou escolha um toy dataset.'
  };

  get url(): string { return environment.apiUrl; }
  private readonly endpointTutor: string = 'tutor';
  private readonly endpointConfPipeline: string = 'conf_pipeline/';
  private readonly endpointColeta: string = 'coleta_dados/';
  private readonly endpointModelo: string = 'modelos/';
  private readonly endpointMetricas: string = 'metricas/';
  private readonly endpointConfiguraca: string = 'configurar_treinamento';
  private readonly endpointClassificador: string = 'classificador';


  private loaded = false;

  constructor(private http: HttpClient) { }

  carregarDados() {
    if (this.loaded) return;
    this.loaded = true;
    this.carregarItensColetasDados();
    this.carregarItensPreProcessamento();
    this.carregarItensModelos();
    this.carregarItensMetricas();
  }


  // EVENTO DE MUDANÇA NO PIPE
  emitirProximaEtapaPipe(dado: any) {
    this.proximaEtapaPipe.next(dado);
  }

  emitInfoItemClicked(item: ItemPipeline) {
    this.infoItemClicked.next(item);
  }

  // TOY DATASETS
  getToyDatasets() {
    return this.http.get<any[]>(`${this.url}toy_datasets/`);
  }

  carregarToyDataset(nome: string) {
    return this.http.get<any>(`${this.url}toy_datasets/${nome}`);
  }

  private resultadoDataset = new Subject<any>();
  resultadoDataset$ = this.resultadoDataset.asObservable();

  emitirResultadoDataset(resultado: any) {
    this.resultadoDataset.next(resultado);
  }

  // SERVIÇOS COM LIGAÇÃO COM BANCO 

  // USUÁRIOS
  criarConvite(dados: { nome: string; email: string; tipo: string }) {
    return this.http.post<any>(`${this.url}usuario/convite`, dados);
  }

  listarUsuarios() {
    return this.http.get<any[]>(`${this.url}usuario/`);
  }

  alterarStatusUsuario(userId: string, status: string) {
    return this.http.put<any>(`${this.url}usuario/${userId}/status?novo_status=${status}`, {});
  }

  reenviarConvite(userId: string) {
    return this.http.post<any>(`${this.url}usuario/${userId}/reenviar-convite`, {});
  }

  excluirUsuario(userId: string) {
    return this.http.delete<any>(`${this.url}usuario/${userId}`);
  }

  verificarConvite(token: string) {
    return this.http.get<any>(`${this.url}convite/${token}`);
  }

  ativarConta(token: string, senha: string, confirmarSenha: string) {
    return this.http.post<any>(`${this.url}convite/${token}/ativar`, { senha, confirmar_senha: confirmarSenha });
  }

  getTutor(params: any) {
    return this.http.get(`${this.url}${this.endpointTutor}/?${params}`);
  }

  getTutorEditar(body: any) {
    const params = new URLSearchParams(body as any).toString();
    return this.http.get(`${this.url}${this.endpointTutor}/editar?${params}`);
  }

  putTutor(body: any, id: string) {
    return this.http.put(`${this.url}${this.endpointTutor}/${id}`, body);
  }

  // Auditoria: log de edicoes do tutor por pipe
  getTutorAudit(pipe?: string, limite = 20) {
    const params = new URLSearchParams();
    if (pipe) params.set('pipe', pipe);
    params.set('limite', String(limite));
    return this.http.get<any[]>(`${this.url}${this.endpointTutor}/audit?${params.toString()}`);
  }

  // Chatbot tutor: o backend faz o proxy para a NVIDIA (a chave fica no servidor).
  chatTutor(mensagens: { role: string; content: string }[], contexto: any) {
    return this.http.post<{ resposta: string }>(`${this.url}${this.endpointTutor}/chat`, { mensagens, contexto });
  }

  // Chatbot tutor via streaming (SSE)
  chatTutorStream(mensagens: { role: string; content: string }[], contexto: any): Observable<string> {
    return new Observable<string>(subscriber => {
      const body = JSON.stringify({ mensagens, contexto });
      fetch(`${this.url}${this.endpointTutor}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('token') || ''}`,
        },
        body,
      }).then(async response => {
        if (!response.ok) {
          const err = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
          subscriber.error(new Error(err.detail || 'Erro ao conectar com o tutor'));
          return;
        }
        const reader = response.body?.getReader();
        if (!reader) {
          subscriber.error(new Error('Stream não disponível'));
          return;
        }
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              subscriber.complete();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                subscriber.error(new Error(parsed.error));
                return;
              }
              if (parsed.token) {
                subscriber.next(parsed.token);
              }
            } catch { /* skip malformed */ }
          }
        }
        subscriber.complete();
      }).catch(err => subscriber.error(err));
    });
  }

  // Histórico de conversas do chat tutor
  chatHistoricoListar(pipelineId?: string) {
    const params = pipelineId ? `?pipeline_id=${pipelineId}` : '';
    return this.http.get<any[]>(`${this.url}${this.endpointTutor}/chat/historico${params}`);
  }

  chatHistoricoObter(chatId: string) {
    return this.http.get<any>(`${this.url}${this.endpointTutor}/chat/historico/${chatId}`);
  }

  chatHistoricoCriar(pipelineId?: string, titulo?: string) {
    const params = new URLSearchParams();
    if (pipelineId) params.set('pipeline_id', pipelineId);
    if (titulo) params.set('titulo', titulo);
    return this.http.post<any>(`${this.url}${this.endpointTutor}/chat/historico?${params.toString()}`, {});
  }

  chatHistoricoAtualizar(chatId: string, mensagens: { role: string; content: string }[], titulo?: string) {
    const params = titulo ? `?titulo=${encodeURIComponent(titulo)}` : '';
    return this.http.put<any>(`${this.url}${this.endpointTutor}/chat/historico/${chatId}${params}`, mensagens);
  }

  chatHistoricoDeletar(chatId: string) {
    return this.http.delete<any>(`${this.url}${this.endpointTutor}/chat/historico/${chatId}`);
  }

  putTutorTipoAprendizado(body: any, id: string) {
    return this.http.put(`${this.url}${this.endpointTutor}/editar-tipo-aprendizado/${id}`, body);
  }

  putTutorModelo(body: any, id: string) {
    return this.http.put(`${this.url}${this.endpointTutor}/editar-modelos/${id}`, body);
  }

  putTutorParams(body: any, id: string, params: any) {
    return this.http.put(`${this.url}${this.endpointTutor}/${id}?${params}`, body);
  }

  postColetaArquivo(tipo: string, body: any) {
    const endpoints: Record<string, string> = {
      csv: 'csv',
      tsv: 'csv',
      excel: 'salvar_xlxs',
      xls: 'salvar_xlxs',
      xlsx: 'salvar_xlxs',
      xlxs: 'salvar_xlxs',
      json: 'salvar_json'
    };
    const endpoint = endpoints[tipo] || `salvar_${tipo}`;
    return this.http.post(`${this.url}${this.endpointColeta}${endpoint}`, body);
  }

  previewCSV(body: FormData) {
    return this.http.post(`${this.url}${this.endpointColeta}csv/preview`, body);
  }

  getColetaInfo(tipo: string, idConfigurcacaoTreinamento: string) {
    return this.http.get(`${this.url}${this.endpointConfiguraca}/${tipo}/${idConfigurcacaoTreinamento}`);
  }

  putColetaConfig(tipo: string, idColeta: string, body: any) {
    return this.http.put(`${this.url}${this.endpointConfiguraca}/${tipo}/${idColeta}`, body);
  }

  redividirColeta(tipo: string, idConfigurcacaoTreinamento: string, body: any) {
    return this.http.post(`${this.url}${this.endpointConfiguraca}/${tipo}/${idConfigurcacaoTreinamento}/redividir`, body);
  }

  getColetaDadosTreino(idColeta: string, limite: number) {
    return this.http.get(`${this.url}${this.endpointColeta}/unique?id_coleta=${idColeta}&limit=${limite}`);
  }

  getModelosParams(params: any) {
    return this.http.get<ItemPipeline[]>(`${this.url}${this.endpointConfPipeline}${this.endpointModelo}todos?${params}`);
  }


  classificadorTreino(tipoClassficador: string, body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/treinamento/${tipoClassficador}`, body);
  }

  postMetricas(body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/avaliar_modelos`, body);
  }

  gerarPairplot(body: { arquivo_id: string; configuracao_id: string; colunas?: string[]; hue?: string | null }) {
    return this.http.post(`${this.url}visualizacao/pairplot`, body);
  }

  classificadorPrever(body: any) {
    return this.http.post(`${this.url}${this.endpointClassificador}/prever`, body);
  }


  fetchItensColetasDados() {
    return this.http.get<ItemPipeline[]>(`${this.url}${this.endpointConfPipeline}${this.endpointColeta}todos`);
  }

  fetchItensModelos() {
    // limite=100 (teto do backend): a rota /todos pagina com limite=10 por padrao,
    // o que ocultava modelos quando o catalogo passou de 10 itens.
    return this.http.get<ItemPipeline[]>(`${this.url}${this.endpointConfPipeline}${this.endpointModelo}todos?limite=100`);
  }

  fetchItensMetricas() {
    // limite=100: mesma paginacao padrao de 10 ocultava metricas alem da 10a.
    return this.http.get<ItemPipeline[]>(`${this.url}${this.endpointConfPipeline}${this.endpointMetricas}todos?limite=100`);
  }

  patchHabilitado(tipo: 'coleta_dados' | 'modelos' | 'metricas' | 'pre_processamento', id: string, habilitado: boolean) {
    return this.http.patch(
      `${this.url}${this.endpointConfPipeline}${tipo}/${id}/habilitado`,
      { habilitado }
    );
  }

  // Catalogo canonico de pre-processamento vive no front (itens-coletas-dados.json).
  // Overrides de habilitado/desabilitado vivem em db.pre_processamento.
  getPreProcessamentoCatalogo(): any[] {
    return (itensPipeline.itensPreProcessamento as any[]) || [];
  }

  fetchPreProcessamentoOverrides() {
    return this.http.get<{valor: string, habilitado: boolean}[]>(
      `${this.url}${this.endpointConfPipeline}pre_processamento/todos`
    );
  }

  // SERVIÇOS SEM LIGAÇÃO COM BANCO

  carregarItensColetasDados() {
    this.fetchItensColetasDados()
      .subscribe({
        next: dados => this.itensColetasDados.next(this.agruparItensColeta(dados)),
        error: err => {
          console.error('Erro ao carregar itens coleta dados:', err);
          this.itensColetasDados.next(this.agruparItensColeta([]));
        }
      });
  }

  private agruparItensColeta(itens: ItemPipeline[]): ItemPipeline[] {
    const itemExistente = itens.find(item => item.valor === 'dados');
    return [{
      ...this.itemDados,
      ...(itemExistente || {}),
      label: 'Dados',
      valor: 'dados',
      tipoItem: 'coleta-dado',
      habilitado: itemExistente?.habilitado ?? true,
      movido: itemExistente?.movido ?? false,
    }];
  }

  getItensColetasDados(): Observable<ItemPipeline[]> {
    return this.itensColetasDados.asObservable();
  }

  carregarItensPreProcessamento() {
    const itens = itensPipeline.itensPreProcessamento as any[];
    // Aplica overrides do admin (habilitado/desabilitado por valor) antes de propagar
    this.fetchPreProcessamentoOverrides().subscribe({
      next: overrides => {
        const map = new Map((overrides || []).map(o => [o.valor, o.habilitado]));
        const filtrados = (itens || []).filter(i => map.get(i.valor) !== false);
        this.itensPreProcessamento.next(filtrados as any);
      },
      error: () => {
        this.itensPreProcessamento.next(itens as any);
      }
    });
  }

  getItensPreProcessamento(): Observable<ItemPipeline[]> {
    return this.itensPreProcessamento.asObservable();
  }

  getItensPreProcessamentoSync(): ItemPipeline[] {
    return this.itensPreProcessamento.value;
  }

  atualizarItensPreProcessamento(itens: ItemPipeline[]) {
    this.itensPreProcessamento.next(itens);
  }

  sincronizarPreProcessamentosSelecionados(itensSelecionados: Pick<ItemPipeline, 'valor'>[]) {
    const valoresSelecionados = new Set(itensSelecionados.map(item => item.valor));
    const valoresVistos = new Set<string>();
    const itensAtualizados = this.itensPreProcessamento.value
      .filter(item => {
        if (valoresVistos.has(item.valor)) return false;
        valoresVistos.add(item.valor);
        return true;
      })
      .map(item => ({
        ...item,
        movido: valoresSelecionados.has(item.valor)
      }));

    this.itensPreProcessamento.next(itensAtualizados);
    this.moverItensEmExecucao();
  }

  carregarItensModelos() {
    this.fetchItensModelos()
      .subscribe({
        next: dados => {
          // Filtra itens desabilitados pelo admin (flag habilitado=false)
          this.itensModelos.next((dados || []).filter((d: any) => d?.habilitado !== false));
        },
        error: err => {
          console.error('Erro ao carregar itens modelos:', err);
        }
      });
  }

  getModelos() {
    return this.itensModelos.asObservable();
  }

  carregarItensMetricas() {
    this.fetchItensMetricas()
      .subscribe({
        next: dados => this.itensMetricas.next((dados || []).filter((d: any) => d?.habilitado !== false)),
        error: err => {
          console.error('Erro ao carregar itens coleta dados:', err);
        }
      });
  }

  getItensMetricas() {
    return this.itensMetricas.asObservable();
  }


  getItemsEmExecucao() {
    return this.itemsEmExecucao.asObservable();
  }

  limparItensExecucao() {
    this.itemsEmExecucao.next([]);
    this.datasetEmExecucao = null;

    // Reseta o status dos widgets das colunas para o estado original
    // (movido=false, habilitado no estado default) para que o usuário
    // possa mover/selecionar novamente após limpar.
    const resetColeta = this.itensColetasDados.value.map(i => ({
      ...i,
      movido: false,
      habilitado: true,
    }));
    this.itensColetasDados.next(resetColeta);

    const resetPre = this.itensPreProcessamento.value.map(i => ({
      ...i,
      movido: false,
    }));
    this.itensPreProcessamento.next(resetPre);

    const resetModelos = this.itensModelos.value.map(i => ({
      ...i,
      movido: false,
      habilitado: false,
    }));
    this.itensModelos.next(resetModelos);

    const resetMetricas = this.itensMetricas.value.map(i => ({
      ...i,
      movido: false,
      habilitado: false,
    }));
    this.itensMetricas.next(resetMetricas);
  }


  getModelosPorTipo(preverCategoria: boolean, dadosRotulados: boolean): ItemPipeline[] {
    return this.itensModelos.getValue().filter(item => (item?.preverCategoria === preverCategoria && item.dadosRotulados === dadosRotulados));
  }

  // Agrupa TODO o catalogo por tipo de tarefa (classificacao/regressao/agrupamento)
  // e marca cada modelo como `compativel` com o target do dataset. Usado pela tela
  // de Selecao do Modelo para exibir secoes por tipo, desabilitando os incompativeis.
  getModelosAgrupados(preverCategoria: boolean, dadosRotulados: boolean): { tipo: string; titulo: string; modelos: any[] }[] {
    const todos = this.itensModelos.getValue();
    const grupos = [
      { tipo: 'classificacao', titulo: 'Classificação', modelos: [] as any[] },
      { tipo: 'regressao', titulo: 'Regressão', modelos: [] as any[] },
      { tipo: 'agrupamento', titulo: 'Agrupamento', modelos: [] as any[] },
    ];
    for (const m of todos) {
      const grupo = grupos.find(g => g.tipo === this.determinarTipoModelo(m));
      if (grupo) {
        grupo.modelos.push({
          ...m,
          compativel: m.preverCategoria === preverCategoria && m.dadosRotulados === dadosRotulados,
        });
      }
    }
    return grupos.filter(g => g.modelos.length > 0);
  }


  // getMetricasPorModelo(modelo: string, considerarMovido: boolean = false): string[] {
  //   // const itemTreino = this.itensModelos.value.find(item => item.valor === modelo);

  //   // // Se não encontrar ou não tiver métricas, retorna array vazio
  //   // const metricasDoModelo = itemTreino?.metricas ?? [];

  //   // if (considerarMovido) {
  //   //   // Filtra métricas movidas que pertençam ao modelo
  //   //   const metricasMovidas = this.itensMetricas.value
  //   //     .filter(item => item.movido && metricasDoModelo.includes(item.valor))
  //   //     .map(item => item.valor);

  //   //   if (metricasMovidas.length) {
  //   //     return metricasMovidas;
  //   //   }

  //   //   return [];
  //   // }

  //   // return metricasDoModelo;
  // }

  movendoItemExecucao(item: ItemPipeline) {
    if (item.tipoItem === 'coleta-dado' && item.valor === 'dataset') {
      this.datasetEmExecucao = item;
    } else if (item.tipoItem === 'coleta-dado') {
      this.datasetEmExecucao = null;
    }

    this.itemsEmExecucao.next([
      ...this.itemsEmExecucao.value,
      item
    ]);

    const itensAtualizados = this.itensColetasDados.value.map(i => ({
      ...i,
      habilitado: false
    }));
    this.itensColetasDados.next(itensAtualizados);

    const modelosAtualizados = this.itensModelos.value.map(i => ({
      ...i,
      // habilitado: false
    }));

    this.itensModelos.next(modelosAtualizados);

    const itenssMetricaAtualizados = this.itensMetricas.value.map(i => ({
      ...i,
      // habilitado: false
    }));
    this.itensMetricas.next(itenssMetricaAtualizados);
  }

  moverItensEmExecucao() {

    const itensMovidos = [
      ...this.itensColetasDados.value.filter(item => item.movido),
      ...(this.datasetEmExecucao ? [this.datasetEmExecucao] : []),
      ...this.itensPreProcessamento.value.filter(item => item.movido),
      ...this.itensModelos.value.filter(item => item.movido),
      ...this.itensMetricas.value.filter(item => item.movido)
    ];

    this.itemsEmExecucao.next(itensMovidos);
  }

  jaFoiMovido(item: ItemPipeline): boolean {
    return this.itemsEmExecucao.value.some(i => i.label === item.label);
  }

  habilitadarModelos(tipoTargetSelecionado: any, habilitado: boolean) {
    const itensAtualizados = this.itensModelos.value.map(item => ({
      ...item,
      habilitado: item.tipo === tipoTargetSelecionado
    }));
    this.itensModelos.next(itensAtualizados);
  }

  selecionarModelo(modeloSelecionado: any) {
    const itensAtualizados = this.itensModelos.value.map(item => ({
      ...item,
      habilitado: item.habilitado,
      movido: item.valor === modeloSelecionado.valor ? true : item.movido
    }));
    this.itensModelos.next(itensAtualizados);
  }

  private determinarTipoModelo(modelo: ItemPipeline): string {
    if (!modelo.dadosRotulados) return 'agrupamento';
    if (modelo.preverCategoria) return 'classificacao';
    return 'regressao';
  }

  habilitadarMetricas(modelos: any[]) {

    const modelosSelecionados = this.itensModelos.getValue().filter(
      m => modelos.includes(m.valor)
    );

    let metricasComuns: string[] = [];

    if (modelosSelecionados.length > 0) {
      const todosTemMetricas = modelosSelecionados.every(m => (m.metricas?.length ?? 0) > 0);

      if (todosTemMetricas) {
        metricasComuns = modelosSelecionados
          .map(m => m.metricas ?? [])
          .reduce((acc, metricas) => acc.filter(m => metricas.includes(m)));
      } else {
        const metricasPorTipo: Record<string, string[]> = {
          classificacao: ['accuracy_score', 'precision_score', 'recall_score', 'f1_score', 'confusion_matrix'],
          regressao: ['r2_score', 'mean_squared_error', 'root_mean_squared_error', 'mean_absolute_error'],
          agrupamento: ['silhouette_score', 'calinski_harabasz_score', 'davies_bouldin_score'],
        };
        const tipo = this.determinarTipoModelo(modelosSelecionados[0]);
        metricasComuns = metricasPorTipo[tipo] ?? [];
      }
    }

    const itensAtualizados = this.itensMetricas.value.map(item => ({
      ...item,
      habilitado: metricasComuns.includes(item.valor)
    }));

    this.itensMetricas.next(itensAtualizados);

    return itensAtualizados

  }

  selecionarMetricas(metricaSelecionada: ItemPipeline) {

    const itensAtualizados = this.itensMetricas.value.map(item => ({
      ...item,
      habilitado: item.habilitado,
      movido: item.valor === metricaSelecionada.valor ? true : item.movido
    }));
    this.itensMetricas.next(itensAtualizados);

    const movidos = itensAtualizados.filter(item => item.movido === true);
    return movidos;

  }

}
