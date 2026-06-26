import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from '../services/dashboard.service';
import { ItemPipeline, MediaMetrica, ResultadoColetaDado } from '../../models/item-coleta-dado.model';
import { ModalExecucaoComponent } from './modals/modal-execucao/modal-execucao.component';
import { TutorContexto } from '../tutor/tutor.component';
import { conteudoParaItemInfo } from '../tutor/conteudo-to-item-info';
import { Subject, takeUntil } from 'rxjs';
import tutor from '../../constants/tutor.json';
import { ScriptGeneratorService } from '../../service/script-generator.service';
import { PipelineService, PipelineState } from '../../service/pipeline.service';
import { SessionService } from '../../service/sessao-store.service';
import { ActivatedRoute, Router } from '@angular/router';
import { NomearPipelineDialogComponent } from './modals/nomear-pipeline-dialog/nomear-pipeline-dialog.component';
import { AuthService } from '../../service/auth/auth.service';
import { AtividadeService } from '../../service/atividade/atividade.service';
import { NotificacaoService } from '../../service/notificacao.service';

const TIPOS_ARQUIVO_DADOS = ['csv', 'tsv', 'json', 'excel', 'xlxs'];

@Component({
  selector: 'app-execucoes',
  templateUrl: './execucoes.component.html',
  styleUrls: ['./execucoes.component.scss'],
  standalone: false,
})
export class ExecucoesComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  private modalAberto = false;
  private tutorRef = tutor;
  // Evita auto-abrir o modal ao restaurar um projeto salvo; rastreia os modelos
  // já vistos na lane para detectar um preditor recém-arrastado.
  private carregandoProjeto = false;
  private treinoVistos = new Set<string>();

  tutor: any;
  tutorPipelineInfo: any = null;
  tutorItemInfo: any = null;
  tutorTheme = 'default';
  tutorThemeClass = 'theme-default';
  chatAberto = false;
  chatContexto: any = null;
  chatSugestoes: string[] = [];
  paramsTutor = '';
  etapaAtual = '';
  usuarioMenuAberto = false;
  nomeUsuario = 'Usuario';
  emailUsuario = '';
  roleUsuario = '';

  itens: ItemPipeline[] = [];
  colunaColeta: ItemPipeline[] = [];
  colunaPreProcessamento: ItemPipeline[] = [];
  colunaTreino: ItemPipeline[] = [];
  colunaMetrica: ItemPipeline[] = [];

  resultadoColetaDado?: ResultadoColetaDado;
  modeloSelecionado?: ItemPipeline;
  // Preditores treinados para comparação (mesma categoria). O clássico passa a
  // acumular vários modelos; a avaliação/painel já compara N modelos.
  modelosSelecionados: ItemPipeline[] = [];
  resultadoTreinamento?: any;
  metricasSelecionadas: ItemPipeline[] = [];
  mediaMetricas: MediaMetrica = 'weighted';
  resultadosDasAvaliacoes: any = {};
  preProcessamentoConfig: any = null;
  hiperparametrosAtuais: any = {};

  constructor(
    private dashboardService: DashboardService,
    public dialog: MatDialog,
    private scriptGenerator: ScriptGeneratorService,
    private pipelineService: PipelineService,
    private sessionService: SessionService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private atividade: AtividadeService,
    private notificacao: NotificacaoService
  ) { }

  ngOnInit(): void {
    this.nomeUsuario = sessionStorage.getItem('name') || 'Usuario';
    this.emailUsuario = sessionStorage.getItem('email') || '';
    this.roleUsuario = this.authService.getUsuarioRole();

    this.getTutor('inicio');
    this.dashboardService.getItemsEmExecucao().pipe(takeUntil(this.destroy$)).subscribe(itens => {
      this.itens = [...itens];
      this.colunaColeta = itens.filter(i => i.tipoItem === 'coleta-dado');
      this.colunaPreProcessamento = itens.filter(i => i.tipoItem === 'pre-processamento');
      this.colunaTreino = itens.filter(i => i.tipoItem === 'treino-validacao-teste');
      this.colunaMetrica = itens.filter(i => i.tipoItem === 'metrica');
      this.metricasSelecionadas = this.colunaMetrica.filter(i => i.movido);

      // Preditor recém-arrastado para a lane de treino. Se já há um modelo
      // treinado, abre o modal de comparação direto na seleção (ajuste de
      // hiperparâmetros). O 1º modelo segue clicável (comportamento atual).
      const novoTreino = this.colunaTreino.find(m => !this.treinoVistos.has(m.valor));
      this.colunaTreino.forEach(m => this.treinoVistos.add(m.valor));
      if (novoTreino && !this.carregandoProjeto && !this.modalAberto
          && this.temModeloTreinado() && !this.modeloJaTreinado(novoTreino)) {
        this.abrirModalExecucao(novoTreino);
      }
    });
    this.dashboardService.proximaEtapaPipe$
      .pipe(takeUntil(this.destroy$))
      .subscribe((event: any) => {
        this.getTutor(event.etapaAtual, event.chaves);
      });

    // Escuta cliques de info do pipeline sidebar
    this.dashboardService.infoItemClicked$
      .pipe(takeUntil(this.destroy$))
      .subscribe((item: ItemPipeline) => {
        this.mostrarInfoItem(item, new Event('click'));
      });

    // Escuta selecao de toy dataset
    this.dashboardService.resultadoDataset$
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultado: any) => {
        if (resultado) {
          this.processarDatasetSelecionado(resultado);
        }
      });

    // Verificar se ha um pipeline para carregar
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['pipeline']) {
        this.carregarPipeline(params['pipeline']);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  fecharMenuAoClicarFora(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.usuario-menu')) {
      this.usuarioMenuAberto = false;
    }
  }

  get iniciaisUsuario(): string {
    const partes = this.nomeUsuario.trim().split(/\s+/).filter(Boolean);
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    }
    return (partes[0]?.substring(0, 2) || 'A').toUpperCase();
  }

  get papelUsuario(): string {
    const papeis: Record<string, string> = {
      aluno: 'Aluno',
      professor: 'Professor',
      admin: 'Admin'
    };
    return papeis[this.roleUsuario] || this.roleUsuario || 'Aluno';
  }

  get usuarioAdmin(): boolean {
    return this.roleUsuario === 'admin';
  }

  getTituloColeta(item: ItemPipeline): string {
    if (!this.resultadoColetaDado) {
      return item.label;
    }
    return this.resultadoColetaDado.nomeDataset
      || this.resultadoColetaDado.treino?.nomeArquivo
      || item.label;
  }

  getResumoFonteColeta(): string {
    const resultado = this.resultadoColetaDado;
    if (!resultado) return '';

    const fonte = resultado.fonteDados === 'dataset' ? 'Toy dataset' : 'Arquivo';
    const treino = resultado.treino?.totalDados || 0;
    const teste = resultado.teste?.totalDados || 0;
    const total = treino + teste;

    return `${fonte} | ${total || treino} exemplos`;
  }

  getResumoDivisaoColeta(): string {
    const resultado = this.resultadoColetaDado;
    if (!resultado) return '';

    if (resultado.teste?.nomeArquivo) {
      return `Treino: ${resultado.treino?.totalDados || 0} | Teste enviado: ${resultado.teste.totalDados || 0}`;
    }

    const treino = resultado.porcentagemTreino || 70;
    return `Treino/Teste: ${treino}%/${100 - treino}%`;
  }

  getResumoPreProcessamento(item: ItemPipeline): { colunas: string[] } | null {
    if (!this.preProcessamentoConfig?.itens) return null;
    
    const configItem = this.preProcessamentoConfig.itens.find(
      (i: any) => i.valor === item.valor
    );
    
    if (!configItem || !configItem.colunas || configItem.colunas.length === 0) return null;
    
    return { colunas: configItem.colunas };
  }

  getResumoTreinamento(item: ItemPipeline): { hiperparametros: { nome: string; valor: any }[] } | null {
    if (!this.hiperparametrosAtuais || Object.keys(this.hiperparametrosAtuais).length === 0) return null;
    
    const modelos = this.tutorRef.modelos as any;
    const modeloInfo = modelos?.[item.valor];
    
    if (!modeloInfo?.hiperparametros) return null;
    
    const hiperparametros = Object.entries(modeloInfo.hiperparametros)
      .map(([key, param]: [string, any]) => ({
        nome: (param as any).nome || key,
        valor: this.hiperparametrosAtuais[key] !== undefined ? this.hiperparametrosAtuais[key] : (param as any).padrao
      }));
    
    if (hiperparametros.length === 0) return null;
    
    return { hiperparametros };
  }


  abrirModalExecucao(item: ItemPipeline): void {
    if (this.modalAberto) return;

    // Comparação: adicionar um preditor quando já existe outro treinado.
    const ehComparacao = item.tipoItem === 'treino-validacao-teste'
      && this.temModeloTreinado() && !this.modeloJaTreinado(item);
    if (ehComparacao && !this.mesmaCategoriaDosTreinados(item)) {
      this.notificacao.aviso('Só dá para comparar preditores da mesma categoria (classificação, regressão ou agrupamento).');
      // O item já entrou na lane pelo drop; remove o card órfão e devolve à barra.
      this.descartarPreditorNaoTreinado(item);
      return;
    }

    this.modalAberto = true;

    // Modelo de comparação entra direto na seleção (ajuste de hiperparâmetros do
    // novo preditor); o 1º modelo mantém o fluxo atual (treinamento).
    const etapa = ehComparacao ? 'selecao-modelo'
      : item.tipoItem === 'metrica' ? 'avaliacao'
        : item.tipoItem === 'treino-validacao-teste' ? 'treinamento'
          : item.tipoItem === 'pre-processamento' ? 'pre-processamento' : item.tipoItem;

    this.atividade.registrar('ui', 'abriu_etapa', { contexto: 'classico', etapa, item: item.valor });

    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none',
      width: 'auto',
      disableClose: true,
      hasBackdrop: false,
      data: {
        etapa,
        tipoArquivoSelecionado: item.tipoItem === 'coleta-dado' && TIPOS_ARQUIVO_DADOS.includes(item.valor) ? item.valor : undefined,
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: item.tipoItem === 'treino-validacao-teste' ? item : this.modeloSelecionado,
        resultadoTreinamento: this.resultadoTreinamento,
        metricasSelecionadas: this.metricasSelecionadas,
        mediaMetricas: this.mediaMetricas,
        // Ao adicionar um modelo novo, não reaproveita a avaliação antiga: a etapa
        // de avaliação re-roda para comparar TODOS os modelos com as métricas atuais.
        resultadosDasAvaliacoes: ehComparacao ? {} : this.resultadosDasAvaliacoes,
        preProcessamentoConfig: this.preProcessamentoConfig
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((resultado: any) => {
      this.modalAberto = false;
      if (!resultado) return;

      // O modal só fecha via fechar() (disableClose), que SEMPRE devolve estado —
      // inclusive ao cancelar (X). Por isso a decisão é baseada no que foi de fato
      // TREINADO, não no simples fechamento.
      const merged = { ...(this.resultadoTreinamento || {}), ...(resultado.resultadoTreinamento || {}) };
      const itemTreinado = this.estaNoResultado(merged, item);
      const modeloDoModal: ItemPipeline | undefined = resultado.modeloSelecionado;
      const modeloDoModalTreinado = this.estaNoResultado(merged, modeloDoModal);

      // Adição de comparação cancelada/incompleta (preditor arrastado não treinou):
      // remove o card órfão e PRESERVA o estado anterior (modelo, avaliações, etc.).
      if (ehComparacao && !itemTreinado) {
        this.descartarPreditorNaoTreinado(item);
        return;
      }

      this.resultadoColetaDado = resultado.resultadoColetaDado;
      this.resultadoTreinamento = merged;
      // Só seleciona/registra modelos efetivamente treinados (evita modelo fantasma).
      if (modeloDoModalTreinado) {
        this.modeloSelecionado = modeloDoModal;
        this.registrarModeloSelecionado(modeloDoModal);
      } else if (itemTreinado) {
        this.modeloSelecionado = item;
      }
      if (itemTreinado) this.registrarModeloSelecionado(item);
      this.metricasSelecionadas = resultado.metricasSelecionadas;
      this.mediaMetricas = resultado.mediaMetricas || this.mediaMetricas;
      this.resultadosDasAvaliacoes = resultado.resultadosDasAvaliacoes;
      this.preProcessamentoConfig = resultado.preProcessamentoConfig;
      this.hiperparametrosAtuais = resultado.hiperparametrosAtuais || {};

      // Processar itens de pre-processamento
      if (resultado.preProcessamentoConfig?.itens) {
        this.processarItensPreProcessamento(resultado.preProcessamentoConfig.itens);
      }

      this.dashboardService.moverItensEmExecucao();
      this.atualizarTutorContexto();
      this.atividade.registrar('pipeline', 'concluiu_etapa', {
        contexto: 'classico',
        etapa,
        modelo: resultado.modeloSelecionado?.valor,
        treinou: !!resultado.resultadoTreinamento,
        avaliou: !!(resultado.resultadosDasAvaliacoes && Object.keys(resultado.resultadosDasAvaliacoes).length),
      });
    });
  }

  // Descarta um preditor arrastado que não chegou a ser treinado: tira o card da
  // lane, devolve à barra lateral e libera para ser re-adicionado depois.
  private descartarPreditorNaoTreinado(item: ItemPipeline): void {
    this.treinoVistos.delete(item.valor);
    this.dashboardService.removerItemExecucao(item);
    this.dashboardService.moverItensEmExecucao();
  }

  // === Comparação de múltiplos preditores ===
  private temModeloTreinado(): boolean {
    return !!this.resultadoTreinamento && Object.keys(this.resultadoTreinamento).length > 0;
  }

  // O backend devolve a chave do modelo normalizada (sem acento, com "_"); confere as duas formas.
  private estaNoResultado(resultado: any, item: ItemPipeline | undefined): boolean {
    if (!resultado || !item?.valor) return false;
    const chaveBackend = item.valor.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').toLowerCase();
    return resultado.hasOwnProperty(item.valor) || resultado.hasOwnProperty(chaveBackend);
  }

  private modeloJaTreinado(item: ItemPipeline): boolean {
    return this.estaNoResultado(this.resultadoTreinamento, item);
  }

  private categoriaDe(item: ItemPipeline | undefined): 'classificacao' | 'regressao' | 'agrupamento' | undefined {
    if (!item) return undefined;
    if (item.dadosRotulados === false) return 'agrupamento';
    if (item.dadosRotulados === true && item.preverCategoria === true) return 'classificacao';
    if (item.dadosRotulados === true && item.preverCategoria === false) return 'regressao';
    return undefined;
  }

  private mesmaCategoriaDosTreinados(item: ItemPipeline): boolean {
    const ref = this.modelosSelecionados[0] || this.modeloSelecionado;
    const catRef = this.categoriaDe(ref);
    if (!catRef) return true; // sem referência confiável → não bloqueia
    return this.categoriaDe(item) === catRef;
  }

  private registrarModeloSelecionado(modelo: ItemPipeline | undefined): void {
    if (!modelo?.valor) return;
    if (!this.modelosSelecionados.some(m => m.valor === modelo.valor)) {
      this.modelosSelecionados.push(modelo);
    }
  }

  // Remove um preditor da comparação: tira o resultado, o card da lane (devolvendo-o
  // à barra) e zera a avaliação para recalcular com os modelos restantes.
  removerModeloComparacao(item: ItemPipeline, event: Event): void {
    event.stopPropagation();
    if (this.resultadoTreinamento) {
      const chaveBackend = item.valor.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').toLowerCase();
      delete this.resultadoTreinamento[item.valor];
      delete this.resultadoTreinamento[chaveBackend];
    }
    this.modelosSelecionados = this.modelosSelecionados.filter(m => m.valor !== item.valor);
    this.treinoVistos.delete(item.valor);
    // Avaliação/comparação será recalculada com os modelos restantes ao reabrir.
    this.resultadosDasAvaliacoes = {};
    if (this.modeloSelecionado?.valor === item.valor) {
      this.modeloSelecionado = this.modelosSelecionados[0];
    }
    this.dashboardService.removerItemExecucao(item);
    this.atualizarTutorContexto();
    this.atividade.registrar('pipeline', 'removeu_modelo_comparacao', { contexto: 'classico', modelo: item.valor });
    this.notificacao.sucesso(`"${item.label}" removido da comparação.`);
  }

  mostrarInfoItem(item: ItemPipeline, event: Event): void {
    event.stopPropagation();

    // Define o tema baseado no tipo de item
    if (item.tipoItem === 'coleta-dado') {
      this.tutorTheme = 'coleta';
      this.tutorThemeClass = 'theme-coleta';
    } else if (item.tipoItem === 'pre-processamento') {
      this.tutorTheme = 'coleta';
      this.tutorThemeClass = 'theme-coleta';
    } else if (item.tipoItem === 'treino-validacao-teste') {
      this.tutorTheme = 'treino';
      this.tutorThemeClass = 'theme-treino';
    } else if (item.tipoItem === 'metrica') {
      this.tutorTheme = 'metrica';
      this.tutorThemeClass = 'theme-metrica';
    }

    // Busca informacoes do item
    this.tutorItemInfo = this.getItemInfo(item);
    this.tutorPipelineInfo = null;

    // Abre o painel: conteudo estruturado vem do <app-tutor>; o chat recebe contexto + sugestoes
    this.chatContexto = this.montarContextoChat(item, this.tutorItemInfo);
    this.chatSugestoes = this.montarSugestoesContextuais(item, this.tutorItemInfo);
    this.chatAberto = true;
  }

  private montarSugestoesContextuais(item: ItemPipeline, info: any): string[] {
    const nome = info?.titulo || item?.label || 'isso';
    const tipo = item?.tipoItem;
    const base = [
      `Me explique melhor sobre ${nome}.`,
      `Dê um exemplo prático de ${nome}.`,
    ];
    if (tipo === 'coleta-dado') {
      base.push(`Como preparar bem os dados para ${nome}?`);
      base.push('Quais erros comuns na coleta de dados eu devo evitar?');
    } else if (tipo === 'pre-processamento') {
      base.push(`Quando devo aplicar ${nome} no meu pipeline?`);
      base.push(`Que problema acontece se eu não usar ${nome}?`);
    } else if (tipo === 'treino-validacao-teste') {
      base.push(`Quais hiperparâmetros de ${nome} mais importam?`);
      base.push(`Quando ${nome} não é uma boa escolha?`);
    } else if (tipo === 'metrica') {
      base.push(`Como interpretar valores de ${nome}?`);
      base.push(`${nome} é maior-melhor ou menor-melhor?`);
    }
    return base.slice(0, 4);
  }

  toggleChat(): void {
    this.chatAberto = !this.chatAberto;
    if (this.chatAberto && !this.chatContexto) {
      this.chatContexto = this.montarContextoChat();
    }
  }

  private montarContextoChat(item?: ItemPipeline, info?: any): any {
    return {
      etapaAtual: this.etapaAtual || null,
      itemSelecionado: item ? { tipo: item.tipoItem, valor: item.valor, label: item.label } : null,
      infoSelecionada: info || null,
      dataset: this.resultadoColetaDado ? {
        target: this.resultadoColetaDado.target,
        fonte: this.getResumoFonteColeta?.() || null,
      } : null,
      modelo: this.modeloSelecionado ? {
        valor: this.modeloSelecionado.valor,
        label: this.modeloSelecionado.label,
      } : null,
      hiperparametros: this.hiperparametrosAtuais || null,
      preProcessamento: this.preProcessamentoConfig || null,
      metricas: this.metricasSelecionadas?.map(m => m.valor) || [],
    };
  }

  /** Converte o bloco `conteudo` (DB) na estrutura consumida pelo <app-tutor>.
   *  Delega ao helper compartilhado (fonte única do mapeamento DB→card). */
  private conteudoParaItemInfo(conteudo: any, item: ItemPipeline): any {
    return conteudoParaItemInfo(conteudo, item.label);
  }

  private getItemInfo(item: ItemPipeline): any {
    const tipo = item.tipoItem;
    const valor = item.valor;

    // Conteudo educacional vindo do DB (campo `conteudo` no documento do catalogo).
    // Tem prioridade sobre o conteudo hardcoded; quando ausente, cai no fallback.
    const conteudo = (item as any).conteudo;
    if (conteudo && (conteudo.descricao || conteudo.titulo)) {
      return this.conteudoParaItemInfo(conteudo, item);
    }

    // Coleta de dados: conteúdo educacional vem do DB (campo `conteudo`,
    // tratado no início). Sem ele, info mínima (título + resumo).
    if (tipo === 'coleta-dado') {
      return {
        titulo: item.label,
        descricao: item.resumo || 'Etapa de entrada de dados do pipeline.',
        dicas: [],
      };
    }

    // Pré-processamento: conteúdo educacional vem do DB (campo `conteudo`).
    // Sem ele, info mínima (título + resumo).
    if (tipo === 'pre-processamento') {
      return {
        titulo: item.label,
        descricao: item.resumo || 'Técnica de pré-processamento de dados.',
        dicas: [],
      };
    }

    // Modelos: o conteúdo educacional vem do DB (campo `conteudo`, tratado no início).
    // Todos os modelos do catálogo já têm `conteudo`; sem ele, só uma info mínima.
    if (tipo === 'treino-validacao-teste') {
      return {
        titulo: item.label,
        descricao: item.resumo || 'Modelo de machine learning para treinamento.',
        dicas: ['Selecione o modelo e configure os hiperparametros', 'Clique em Treinar para iniciar o processo']
      };
    }

    // Métricas: idem — conteúdo vem do DB; sem ele, info mínima.
    if (tipo === 'metrica') {
      return {
        titulo: item.label,
        descricao: item.resumo || 'Metrica de avaliacao do modelo.',
        dicas: ['Selecione as metricas para avaliar o modelo']
      };
    }

    return {
      titulo: item.label,
      descricao: 'Clique para executar esta etapa do pipeline.',
      dicas: []
    };
  }

  getTutor(etapa: string, chaves: string[] = []) {
    const params = this.criarBody(etapa, chaves)
    if (params !== this.paramsTutor) {
      this.paramsTutor = params;
      this.etapaAtual = this.etapaAtual;
      this.dashboardService.getTutor(this.paramsTutor).pipe(takeUntil(this.destroy$)).subscribe({
        next: async (res: any) => {
          if (res.descricao) {
            this.tutor = res.descricao.replace(/&nbsp;/g, ' ');
          }
        },
        error: (error: any) => { }
      });
    }
  }

  criarBody(etapa: string, chaves: string[]) {

    const params = new URLSearchParams();
    params.append('pipe', etapa);

    chaves?.forEach(chave => params.append('textos', chave));

    return params.toString();
  }

  limparSessao() {
    sessionStorage.removeItem('idColeta');
    sessionStorage.removeItem('configurcaoTreinamento');
    this.resultadoColetaDado = undefined;
    this.modeloSelecionado = undefined;
    this.resultadoTreinamento = undefined;
    this.metricasSelecionadas = [];
    this.mediaMetricas = 'weighted';
    this.resultadosDasAvaliacoes = {};
    this.preProcessamentoConfig = null;
    this.tutorPipelineInfo = null;
    this.tutorItemInfo = null;
    this.tutorTheme = 'default';
    this.tutorThemeClass = 'theme-default';
    this.dashboardService.limparItensExecucao();
  }

  async baixarPipeline(): Promise<void> {
    this.atividade.registrar('pipeline', 'exportou_script', { contexto: 'classico', modelo: this.modeloSelecionado?.valor });
    await this.scriptGenerator.generatePipelineBundle(
      this.resultadoColetaDado,
      this.modeloSelecionado,
      this.metricasSelecionadas,
      {},
      this.preProcessamentoConfig
    );
  }

  carregarPipeline(id: string): void {
    this.carregandoProjeto = true; // não auto-abrir o modal de comparação ao restaurar
    this.pipelineService.carregarPipeline(id).pipe(takeUntil(this.destroy$)).subscribe(pipeline => {
      if (pipeline) {
        this.resultadoColetaDado = pipeline.resultadoColetaDado;
        this.modeloSelecionado = pipeline.modeloSelecionado;
        // Restaura os preditores da comparação (compat.: cai no modeloSelecionado).
        this.modelosSelecionados = (pipeline.modelosSelecionados && pipeline.modelosSelecionados.length)
          ? pipeline.modelosSelecionados
          : (pipeline.modeloSelecionado ? [pipeline.modeloSelecionado] : []);
        this.modelosSelecionados.forEach(m => m?.valor && this.treinoVistos.add(m.valor));
        this.mediaMetricas = pipeline.mediaMetricas || 'weighted';
        this.metricasSelecionadas = (pipeline.metricasSelecionadas || []).map((metrica: ItemPipeline) => ({
          ...metrica,
          average: metrica.average ?? this.mediaMetricas
        }));
        this.preProcessamentoConfig = pipeline.preProcessamentoConfig;
        this.dashboardService.sincronizarPreProcessamentosSelecionados(this.preProcessamentoConfig?.itens || []);
        this.resultadoTreinamento = pipeline.resultadoTreinamento;
        this.resultadosDasAvaliacoes = pipeline.resultadosDasAvaliacoes;
        this.atualizarTutorContexto();
      }
      this.carregandoProjeto = false;
    });
  }

  salvarPipeline(): void {
    const dialogRef = this.dialog.open<NomearPipelineDialogComponent, any, string | null>(
      NomearPipelineDialogComponent,
      {
        width: '440px',
        disableClose: false,
        autoFocus: 'first-tabbable',
      }
    );

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(nome => {
      if (!nome) return;

      const state: PipelineState = {
        nome,
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: this.modeloSelecionado,
        modelosSelecionados: this.modelosSelecionados,
        metricasSelecionadas: this.metricasSelecionadas,
        mediaMetricas: this.mediaMetricas,
        preProcessamentoConfig: this.preProcessamentoConfig,
        resultadoTreinamento: this.resultadoTreinamento,
        resultadosDasAvaliacoes: this.resultadosDasAvaliacoes
      };

      this.pipelineService.salvarPipeline(state).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.atividade.registrar('pipeline', 'salvou_projeto', { contexto: 'classico', nome });
      });
    });
  }

  alternarMenuUsuario(event: Event): void {
    event.stopPropagation();
    this.usuarioMenuAberto = !this.usuarioMenuAberto;
  }

  navegarParaProjetos(): void {
    this.usuarioMenuAberto = false;
    this.router.navigate(['/view-aluno/projetos']);
  }

  navegarParaGaleria(): void {
    this.usuarioMenuAberto = false;
    this.router.navigate(['/view-aluno/galeria']);
  }

  navegarParaAdmin(): void {
    this.usuarioMenuAberto = false;
    this.router.navigate(['/view-admin']);
  }

  navegarParaUsuarios(): void {
    this.usuarioMenuAberto = false;
    this.router.navigate(['/view-admin/usuarios']);
  }

  sair(): void {
    this.usuarioMenuAberto = false;
    this.authService.logout();
  }

  atualizarTutorContexto(): void {
    if (this.modeloSelecionado) {
      const modelos = this.tutorRef.modelos as any;
      const modeloInfo = modelos?.[this.modeloSelecionado.valor];
      if (modeloInfo) {
        this.tutorPipelineInfo = {
          titulo: modeloInfo.nome,
          descricao: modeloInfo.descricao,
          dicas: modeloInfo.quandoUsar?.slice(0, 3) || []
        };
        this.tutorTheme = 'treino';
        this.tutorThemeClass = 'theme-treino';
      }
    } else if (this.metricasSelecionadas.length > 0) {
      const metricas = this.tutorRef.metricas as any;
      const metricaInfo = metricas?.[this.metricasSelecionadas[0].valor];
      if (metricaInfo) {
        this.tutorPipelineInfo = {
          titulo: metricaInfo.nome,
          descricao: metricaInfo.descricao,
          dicas: metricaInfo.quandoUsar?.slice(0, 3) || []
        };
        this.tutorTheme = 'metrica';
        this.tutorThemeClass = 'theme-metrica';
      }
    } else {
      this.tutorPipelineInfo = null;
      this.tutorTheme = 'default';
      this.tutorThemeClass = 'theme-default';
    }
  }

  processarDatasetSelecionado(resultado: any): void {
    // Atualizar o tutor com informacoes sobre o dataset selecionado
    const datasetNome = resultado.nome_dataset || resultado.nomeDataset || 'Dataset';
    const nAmostras = resultado.n_amostras || resultado.total_dados || 0;
    const nFeatures = resultado.n_features || resultado.colunas?.length || 0;
    const target = resultado.target || '';
    const tipo = resultado.prever_categoria ? 'Classificacao' : 'Regressao';
    const fonte = resultado.fonte || 'sklearn';

    this.tutorItemInfo = {
      titulo: datasetNome,
      descricao: `Dataset de ${tipo.toLowerCase()} com ${nAmostras} amostras e ${nFeatures} features. Fonte: ${fonte}.`,
      dicas: [
        `Target: ${target}`,
        `Tipo: ${tipo}`,
        `Amostras: ${nAmostras}`,
        `Features: ${nFeatures}`
      ]
    };
    this.tutorTheme = 'coleta';
    this.tutorThemeClass = 'theme-coleta';

    // Preparar dados para o modal
    const treino: any = {
      dados: resultado.dados || [],
      totalDados: resultado.total_dados || 0,
      nomeArquivo: datasetNome
    };

    const colunas = resultado.colunas || [];
    const colunasDetalhes = resultado.colunas_detalhes || [];
    const preverCategoria = resultado.prever_categoria || false;
    const dadosRotulados = resultado.dados_rotulados !== false;
    const tipoTarget = resultado.tipo_target || null;

    // Configurar atributos (todos exceto target)
    const att: any = {};
    for (const col of colunas) {
      att[col] = col !== target;
    }

    // Atualizar resultado da coleta
    this.resultadoColetaDado = {
      target: target,
      preverCategoria: preverCategoria,
      dadosRotulados: dadosRotulados,
      colunas: colunas,
      colunasDetalhes: colunasDetalhes,
      porcentagemTreino: 70,
      embaralharDados: true,
      estratificarDados: false,
      tipoTarget: tipoTarget,
      atributos: att,
      tipos: {},
      treino: treino,
      teste: { dados: [], totalDados: 0, nomeArquivo: '' },
      fonteDados: 'dataset',
      nomeDataset: datasetNome,
      datasetId: resultado.id
    };

    // Criar item para a coluna de coleta
    const datasetItem: ItemPipeline = {
      label: datasetNome,
      movido: true,
      tipoItem: 'coleta-dado',
      habilitado: true,
      valor: 'dataset',
      preverCategoria: preverCategoria,
      dadosRotulados: dadosRotulados,
      icon: 'coleta-dado',
      id: 'dataset-' + Date.now()
    };

    // Adicionar item a coluna de coleta
    this.dashboardService.movendoItemExecucao(datasetItem);

    // Salvar IDs no sessionStorage para uso posterior pelo treinamento
    const idColeta = resultado.id_coleta;
    const idConfig = resultado.id_configuracoes_treinamento;
    if (idColeta) {
      this.sessionService.setColetaId(idColeta);
    }
    if (idConfig) {
      this.sessionService.setConfigurcaoTreinamento(idConfig);
    }

    // Abrir modal com dados pre-configurados
    setTimeout(() => {
      this.abrirModalComDataset();
    }, 300);
  }

  abrirModalComDataset(): void {
    if (this.modalAberto) return;
    this.modalAberto = true;

    const dialogRef = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none',
      width: 'auto',
      disableClose: true,
      hasBackdrop: false,
      data: {
        etapa: 'coleta-dado',
        tipoArquivoSelecionado: 'csv',
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: this.modeloSelecionado,
        resultadoTreinamento: this.resultadoTreinamento,
        metricasSelecionadas: this.metricasSelecionadas,
        mediaMetricas: this.mediaMetricas,
        resultadosDasAvaliacoes: this.resultadosDasAvaliacoes
      }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((resultado: any) => {
      this.modalAberto = false;
      if (resultado) {
        this.resultadoColetaDado = resultado.resultadoColetaDado;
        this.modeloSelecionado = resultado.modeloSelecionado;
        this.resultadoTreinamento = resultado.resultadoTreinamento;
        this.metricasSelecionadas = resultado.metricasSelecionadas;
        this.mediaMetricas = resultado.mediaMetricas || this.mediaMetricas;
        this.resultadosDasAvaliacoes = resultado.resultadosDasAvaliacoes;
        this.dashboardService.moverItensEmExecucao();
        this.atualizarTutorContexto();
      }
    });
  }

  processarItensPreProcessamento(itens: any[]): void {
    this.dashboardService.sincronizarPreProcessamentosSelecionados(itens);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
