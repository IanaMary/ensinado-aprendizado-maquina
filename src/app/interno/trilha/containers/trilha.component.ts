import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { SessionService } from '../../../service/sessao-store.service';
import { ScriptGeneratorService } from '../../../service/script-generator.service';
import { PipelineService, PipelineState } from '../../../service/pipeline.service';
import { ItemPipeline, ResultadoColetaDado } from '../../../models/item-coleta-dado.model';
import { TutorItemInfo } from '../../../dashboard/tutor/tutor.component';
import { ModalExecucaoComponent } from '../../../dashboard/execucoes/modals/modal-execucao/modal-execucao.component';
import tutor from '../../../constants/tutor.json';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type Fase = 'data' | 'split' | 'featX' | 'labelY' | 'model' | 'eval' | 'viz';
type Tarefa = 'classificacao' | 'regressao' | 'agrupamento';

interface TrilhaCard {
  uid: string;
  fase: Fase;
  valor: string;
  label: string;
  short?: string;
  item: ItemPipeline;
  status?: 'idle' | 'running' | 'done' | 'erro';
  resultado?: any;
  colunas?: string[];
}

const CORES: Record<string, string> = {
  data: '#22C55E', split: '#14B8A6', featX: '#A855F7', labelY: '#C026D3',
  model: '#3B82F6', eval: '#F59E0B', viz: '#EC4899',
};

@Component({
  selector: 'app-trilha',
  templateUrl: './trilha.component.html',
  styleUrls: ['./trilha.component.scss'],
  standalone: false,
})
export class TrilhaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  cores = CORES;

  catModelos: ItemPipeline[] = [];
  catMetricas: ItemPipeline[] = [];
  catPreProc: ItemPipeline[] = [];

  resultadoColetaDado?: ResultadoColetaDado;
  dataCards: TrilhaCard[] = [];
  splitCard: TrilhaCard | null = null;
  featCards: TrilhaCard[] = [];    // ramo X
  labelCards: TrilhaCard[] = [];   // ramo y
  modelCards: TrilhaCard[] = [];   // ramos de modelo (paralelos)
  evalCards: TrilhaCard[] = [];    // métricas compartilhadas

  resultadoTreinamento: Record<string, any> = {};
  resultadosDasAvaliacoes: any = {};
  mediaMetricas = 'weighted';

  // comparação métrica × modelo (derivada de resultadosDasAvaliacoes)
  comparacaoMetricas: string[] = [];
  comparacaoModelos: string[] = [];

  execRunning = false; execDone = false; execMsg = ''; avisando = false;
  desatualizado = false;
  modalAberto = false;

  pickerOpen = false; pickerFase: Fase | null = null;
  pickerTitle = ''; pickerHint = ''; pickerItems: ItemPipeline[] = [];

  // inspetor
  selecionado: TrilhaCard | null = null;
  inspTab: 'basico' | 'codigo' = 'basico';
  inspInfo: TutorItemInfo | null = null;     // conteúdo didático (via <app-tutor>)
  inspScript = '';                            // aba Código
  hiperParams: Record<string, any[]> = {};    // por uid de card de modelo

  private uidSeq = 0;

  constructor(
    private dashboard: DashboardService,
    private session: SessionService,
    private dialog: MatDialog,
    private scriptGen: ScriptGeneratorService,
    private pipelineSvc: PipelineService,
  ) {}

  ngOnInit(): void {
    this.dashboard.carregarDados();
    this.dashboard.getModelos().pipe(takeUntil(this.destroy$)).subscribe(m => this.catModelos = m || []);
    this.dashboard.getItensMetricas().pipe(takeUntil(this.destroy$)).subscribe(m => this.catMetricas = m || []);
    this.dashboard.getItensPreProcessamento().pipe(takeUntil(this.destroy$)).subscribe(p => this.catPreProc = p || []);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  private uid(): string { return `c${++this.uidSeq}`; }

  // ---------- tarefa (vem dos DADOS) ----------
  get tarefa(): Tarefa | null {
    const r = this.resultadoColetaDado;
    if (!r || r.preverCategoria == null) return null;
    if (r.dadosRotulados === false) return 'agrupamento';
    if (r.preverCategoria) return 'classificacao';
    return 'regressao';
  }
  get taskPillLabel(): string {
    return this.tarefa === 'agrupamento' ? 'Agrupamento'
      : this.tarefa === 'regressao' ? 'Regressão'
      : this.tarefa === 'classificacao' ? 'Classificação' : 'Defina os dados';
  }

  get temDados(): boolean { return !!this.resultadoColetaDado; }

  get progresso(): number {
    let f = 0;
    if (this.temDados) f++;
    if (this.featCards.length || this.labelCards.length) f++;
    if (this.modelCards.length) f++;
    if (this.evalCards.length) f++;
    if (Object.keys(this.resultadosDasAvaliacoes || {}).length) f++;
    return Math.round((f / 5) * 100);
  }

  get faseGuide() {
    return [
      { num: 1, label: 'Dados', count: this.dataCards.length },
      { num: 2, label: 'Divisão treino/teste', count: this.splitCard ? 1 : 0 },
      { num: 3, label: 'Entrada (X)', count: this.featCards.length },
      { num: 4, label: 'Rótulo (y)', count: this.labelCards.length },
      { num: 5, label: 'Modelos', count: this.modelCards.length },
      { num: 6, label: 'Avaliação', count: this.evalCards.length },
    ];
  }

  // ---------- dados (reusa o modal de coleta) ----------
  addData(): void {
    if (this.modalAberto || this.execRunning) return;
    this.modalAberto = true;
    const ref = this.dialog.open(ModalExecucaoComponent, {
      maxWidth: 'none', width: 'auto', disableClose: true, hasBackdrop: true,
      // Passa o shape completo que o ModalExecucaoComponent espera (ele lê
      // metricasSelecionadas.length e Object.keys(resultadosDasAvaliacoes) sem guarda).
      data: {
        etapa: 'coleta-dado',
        somenteColeta: true,   // a Trilha cuida de pré-proc/modelo/métricas — modal só carrega dados
        resultadoColetaDado: this.resultadoColetaDado,
        modeloSelecionado: undefined,
        resultadoTreinamento: undefined,
        metricasSelecionadas: [],
        mediaMetricas: this.mediaMetricas,
        resultadosDasAvaliacoes: {},
        preProcessamentoConfig: this.preProcCfg(),
      },
    });
    const tarefaAntes = this.tarefa;
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      this.modalAberto = false;
      if (res?.resultadoColetaDado) {
        this.resultadoColetaDado = res.resultadoColetaDado;
        const r = this.resultadoColetaDado!;
        // Trocar a tarefa (ex.: classificação → regressão) invalida modelos/métricas escolhidos.
        if (this.tarefa !== tarefaAntes) this.resetDownstream();
        const nome = r.nomeDataset || r.treino?.nomeArquivo || 'Dados';
        this.dataCards = [{
          uid: this.uid(), fase: 'data', valor: 'dados', label: nome,
          short: r.target ? `alvo: ${r.target}` : 'dados carregados',
          item: { valor: 'dados', label: nome } as any, status: 'done',
        }];
        this.splitCard = this.montarSplitCard(r);
        // modelos/métricas escolhidos antes podem ficar incompatíveis com a nova tarefa
        this.marcarDesatualizado();
      }
    });
  }

  private montarSplitCard(r: ResultadoColetaDado): TrilhaCard {
    const preDividido = !!(r.teste && (r.teste as any).nomeArquivo);
    const short = preDividido
      ? `pré-dividido · treino ${(r.treino as any)?.totalDados ?? '?'} / teste ${(r.teste as any)?.totalDados ?? '?'}`
      : `treino ${r.porcentagemTreino ?? 70}% / teste ${100 - (r.porcentagemTreino ?? 70)}%`;
    return {
      uid: this.uid(), fase: 'split', valor: 'split', label: 'Divisão treino/teste',
      short, item: { valor: 'split', label: 'Divisão treino/teste' } as any, status: 'done',
      resultado: { preDividido },
    };
  }

  // ---------- picker ----------
  private modeloTipo(m: ItemPipeline): Tarefa {
    if (m.dadosRotulados === false) return 'agrupamento';
    if (m.preverCategoria) return 'classificacao';
    return 'regressao';
  }
  private escopoPreProc(p: ItemPipeline): string {
    const esc = (p.execucao as any)?.escopo;
    if (esc) return esc;
    return p.valor === 'label_encoder' ? 'encode_y' : 'transform_X';
  }

  abrirPicker(fase: Fase): void {
    if (this.execRunning) return;
    this.pickerFase = fase;
    if (fase === 'featX') {
      this.pickerTitle = 'Pré-processamento de entrada (X)';
      this.pickerHint = 'Transformações nas features, em sequência';
      this.pickerItems = this.catPreProc.filter(p => this.escopoPreProc(p) !== 'encode_y');
    } else if (fase === 'labelY') {
      this.pickerTitle = 'Tratamento do rótulo (y)';
      this.pickerHint = 'Transformações no alvo (didático)';
      this.pickerItems = this.catPreProc.filter(p => this.escopoPreProc(p) === 'encode_y');
    } else if (fase === 'model') {
      this.pickerTitle = 'Adicionar modelo';
      this.pickerHint = this.tarefa ? `Modelos de ${this.taskPillLabel.toLowerCase()}` : 'Carregue os dados primeiro';
      const t = this.tarefa;
      this.pickerItems = t ? this.catModelos.filter(m => this.modeloTipo(m) === t) : this.catModelos;
    } else if (fase === 'eval') {
      this.pickerTitle = 'Adicionar métrica';
      this.pickerHint = 'Aplicada a todos os modelos (comparação)';
      const t = this.tarefa;
      // Filtro estrito quando a tarefa é conhecida: não oferece métricas incompatíveis
      // (mesmo que o resultado seja vazio). Só mostra todas quando não há tarefa ainda.
      this.pickerItems = t
        ? this.catMetricas.filter((x: any) => (x.grupo || 'classificacao') === t)
        : this.catMetricas;
    }
    this.pickerOpen = true;
  }
  fecharPicker(): void { this.pickerOpen = false; this.pickerFase = null; }

  escolher(item: ItemPipeline): void {
    const fase = this.pickerFase; if (!fase) return;
    const card: TrilhaCard = {
      uid: this.uid(), fase, valor: item.valor, label: item.label || item.valor,
      short: (item as any).resumo, item, status: 'idle', colunas: [],
    };
    if (fase === 'featX') this.featCards.push(card);
    else if (fase === 'labelY') this.labelCards.push(card);
    else if (fase === 'model') {
      if (this.modelCards.some(c => c.valor === item.valor)) { this.fecharPicker(); return; }
      this.carregarHiperParams(card);
      this.modelCards.push(card);
    } else if (fase === 'eval') {
      if (!this.evalCards.some(c => c.valor === item.valor)) this.evalCards.push(card);
    }
    this.marcarDesatualizado();
    this.fecharPicker();
    this.selecionar(card);  // abre o inspetor no bloco recém-adicionado
  }

  // ---------- inspetor (conteúdo didático + ajustes + features + código) ----------
  selecionar(card: TrilhaCard): void {
    this.selecionado = card;
    this.inspTab = 'basico';
    this.inspInfo = this.montarInfo(card);
    if (card.fase === 'split') {
      const r = this.resultadoColetaDado;
      this.splitDraft = {
        testSize: r ? 1 - (r.porcentagemTreino ?? 70) / 100 : 0.3,
        shuffle: r?.embaralharDados ?? true,
        stratify: r?.estratificarDados ?? false,
      };
    }
    this.atualizarScript();
  }

  // ----- divisão treino/teste editável (reusa redividirColeta) -----
  splitDraft = { testSize: 0.3, shuffle: true, stratify: false };
  salvandoSplit = false;
  get splitPreDividido(): boolean { return !!this.splitCard?.resultado?.preDividido; }

  aplicarDivisao(): void {
    const cfg = this.session.getConfigurcaoTreinamento();
    if (!cfg || !this.resultadoColetaDado) return;
    this.salvandoSplit = true;
    const body = {
      test_size: this.splitDraft.testSize,
      shuffle: this.splitDraft.shuffle,
      // estratificação só se aplica a classificação
      stratify: this.tarefa === 'classificacao' ? this.splitDraft.stratify : false,
      target: this.resultadoColetaDado.target,
    };
    this.dashboard.redividirColeta('xlxs', cfg, body).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        const r = this.resultadoColetaDado!;
        r.porcentagemTreino = Math.round((1 - this.splitDraft.testSize) * 100);
        r.embaralharDados = this.splitDraft.shuffle;
        r.estratificarDados = this.splitDraft.stratify;
        if (this.splitCard) this.splitCard.short = `treino ${r.porcentagemTreino}% / teste ${100 - r.porcentagemTreino}%`;
        this.salvandoSplit = false; this.marcarDesatualizado();
      },
      error: (err) => { this.salvandoSplit = false; this.flash(err?.error?.detail || 'Falha ao redividir os dados.'); },
    });
  }
  fecharInsp(): void { this.selecionado = null; this.inspInfo = null; this.inspScript = ''; }
  setTab(t: 'basico' | 'codigo'): void { this.inspTab = t; if (t === 'codigo') this.atualizarScript(); }

  /** Conteúdo didático do elemento (campo `conteudo` do catálogo sklearn) → TutorItemInfo. */
  private montarInfo(card: TrilhaCard): TutorItemInfo {
    const item: any = card.item;
    const c = item?.conteudo;
    if (!c) return { titulo: card.label, descricao: item?.resumo || card.short || '' };
    let hiper: any;
    if (Array.isArray(c.hiperparametros_doc) && c.hiperparametros_doc.length) {
      hiper = {};
      c.hiperparametros_doc.forEach((h: any, i: number) => {
        const faixa = Array.isArray(h.opcoes) ? h.opcoes.join(' | ') : (h.faixa || '');
        hiper[h.nome || i] = {
          nome: h.nome, descricao: h.descricao, padrao: h.default ?? '', tipo: h.tipo || '', faixa,
          implicacoes: [h.efeito, h.quando_ajustar].filter(Boolean).join(' — '), sklearn: h.nome,
        };
      });
    }
    return {
      titulo: c.titulo || card.label, descricao: c.descricao || item?.resumo || '',
      resumo_basico: c.resumo_basico || '',
      dicas: c.dicas, conceitos: c.conceitos, quandoUsar: c.quandoUsar, naoUsarQuando: c.naoUsarQuando,
      vantagens: c.vantagens, desvantagens: c.desvantagens, formula: c.formula, intuicao: c.intuicao,
      exemplo: c.exemplo, exemplo_codigo: c.exemplo_codigo, link_sklearn: c.link_sklearn,
      midia: c.midia, referencias: c.referencias, hiperparametros: hiper,
    };
  }

  // ----- Ajustes: hiperparâmetros por ramo de modelo -----
  private carregarHiperParams(card: TrilhaCard): void {
    const modelos: any = (tutor as any).modelos || {};
    const info = modelos[card.valor];
    let params: any[];
    if (info?.hiperparametros) {
      params = Object.entries(info.hiperparametros).map(([key, v]: [string, any]) => ({
        key, nome: v.nome || key, sklearn: v.sklearn || key, valor: v.padrao, tipo: v.tipo,
        min: v.min, max: v.max, opcoes: v.opcoes,
      }));
    } else {
      const exec = (card.item.execucao as any)?.hiperparametros;
      const lista = Array.isArray(exec) && exec.length ? exec : ((card.item as any).hiperparametros || []);
      params = (lista || []).map((h: any) => {
        const nome = h.nome || h.nomeHiperparametro;
        return { key: nome, nome, sklearn: nome, valor: h.default ?? h.valorPadrao, tipo: h.tipo, opcoes: h.opcoes };
      });
    }
    // Booleano sem opções → vira select true/false (evita input de texto que
    // converteria silenciosamente para false). Normaliza o valor para string.
    for (const p of params) {
      if (String(p.tipo || '').toLowerCase() === 'bool' && !(p.opcoes && p.opcoes.length)) {
        p.opcoes = ['true', 'false'];
        if (typeof p.valor === 'boolean') p.valor = String(p.valor);
      }
    }
    // Faixa para slider: hiperparâmetro numérico sem min/max no catálogo recebe uma
    // faixa sensata (por nome conhecido ou derivada do valor), p/ mostrar slider de
    // verdade em vez de cair em campo de texto.
    for (const p of params) {
      const tipo = String(p.tipo || '').toLowerCase();
      const valorNum = Number(p.valor);
      const ehBool = tipo === 'bool' || (p.opcoes && p.opcoes.length);
      const ehNum = !ehBool && (tipo.includes('int') || tipo.includes('float') || tipo.includes('num')
        || (p.valor != null && p.valor !== '' && typeof p.valor !== 'boolean' && isFinite(valorNum)));
      if (ehNum && (p.min == null || p.max == null)) {
        const f = this.faixaHiper(p.sklearn || p.key, tipo, p.valor);
        if (f) { p.min = f.min; p.max = f.max; p.step = f.step; p.tipo = f.tipo; }
      }
    }
    this.hiperParams[card.uid] = params;
  }

  /** Faixa (min/max/step) para o slider de um hiperparâmetro numérico sem faixa no catálogo. */
  private faixaHiper(nome: string, tipo: string, valor: any): { min: number; max: number; step: number; tipo: string } | null {
    const FAIXAS: Record<string, [number, number, number, string]> = {
      n_neighbors: [1, 50, 1, 'int'], n_estimators: [10, 500, 10, 'int'], max_depth: [1, 50, 1, 'int'],
      min_samples_split: [2, 20, 1, 'int'], min_samples_leaf: [1, 20, 1, 'int'], max_iter: [50, 2000, 50, 'int'],
      n_clusters: [2, 10, 1, 'int'], degree: [1, 6, 1, 'int'], random_state: [0, 100, 1, 'int'],
      C: [0.01, 100, 0.01, 'float'], alpha: [0.0001, 10, 0.0001, 'float'], learning_rate: [0.001, 1, 0.001, 'float'],
      gamma: [0.001, 10, 0.001, 'float'], tol: [0.00001, 0.1, 0.00001, 'float'], l1_ratio: [0, 1, 0.05, 'float'],
    };
    const f = FAIXAS[nome];
    if (f) return { min: f[0], max: f[1], step: f[2], tipo: f[3] };
    const v = Number(valor);
    if (!isFinite(v)) return null;
    if (tipo.includes('int') || Number.isInteger(v)) {
      return { min: 0, max: Math.max(10, Math.ceil(Math.abs(v) * 5) || 10), step: 1, tipo: 'int' };
    }
    const max = Math.max(1, Math.abs(v) * 5 || 1);
    return { min: 0, max: +max.toFixed(4), step: +(max / 100).toFixed(4), tipo: 'float' };
  }
  hiperDe(card: TrilhaCard): any[] { return this.hiperParams[card.uid] || []; }
  setHiper(p: any, valor: any): void { p.valor = valor; this.marcarDesatualizado(); }

  private converter(valor: any, tipo: string): any {
    if (valor === null || valor === undefined || valor === '') return null;
    const t = (tipo || '').toLowerCase();
    if (t.includes('int')) { const n = parseInt(valor, 10); return isNaN(n) ? null : n; }
    if (t.includes('float')) { const n = parseFloat(valor); return isNaN(n) ? null : n; }
    if (t === 'bool') return valor === true || valor === 'true';
    return valor;
  }
  private hiperParaTreino(card: TrilhaCard): Record<string, any> {
    const out: Record<string, any> = {};
    for (const p of this.hiperDe(card)) {
      const k = p.sklearn || p.key;
      const v = this.converter(p.valor, p.tipo);
      if (v !== null) out[k] = v;
    }
    return out;
  }

  // ----- seleção de features (ramo X) -----
  get colunasFeatures(): string[] {
    const r = this.resultadoColetaDado; if (!r?.colunas) return [];
    return r.colunas.filter(c => c !== r.target);
  }
  colunaAtiva(card: TrilhaCard, col: string): boolean {
    return !!card.colunas && card.colunas.includes(col);
  }
  toggleColuna(card: TrilhaCard, col: string): void {
    const set = new Set(card.colunas || []);
    set.has(col) ? set.delete(col) : set.add(col);
    card.colunas = Array.from(set);
    card.short = card.colunas.length ? `${card.colunas.length} colunas` : 'todas as features';
    this.marcarDesatualizado();
  }

  // ----- aba Código: script do ramo selecionado -----
  private preProcCfg(): any {
    return { itens: [...this.featCards, ...this.labelCards].map(c => ({ valor: c.valor, label: c.label, colunas: c.colunas || [] })) };
  }
  private atualizarScript(): void {
    const card = this.selecionado;
    if (card && card.fase === 'model') {
      this.inspScript = this.scriptGen.gerarScriptModelo(
        this.resultadoColetaDado, card.item, this.evalCards.map(c => c.item),
        this.hiperParaTreino(card), this.preProcCfg(),
      );
    } else {
      this.inspScript = '';
    }
  }

  remover(card: TrilhaCard): void {
    if (this.execRunning) return;
    if (this.selecionado === card) this.fecharInsp();
    if (card.fase === 'featX') this.featCards = this.featCards.filter(c => c !== card);
    else if (card.fase === 'labelY') this.labelCards = this.labelCards.filter(c => c !== card);
    else if (card.fase === 'eval') this.evalCards = this.evalCards.filter(c => c !== card);
    else if (card.fase === 'model') this.modelCards = this.modelCards.filter(c => c !== card);
    else if (card.fase === 'data') {
      this.dataCards = []; this.splitCard = null; this.resultadoColetaDado = undefined;
      this.resetDownstream();  // sem dados, pré-proc/modelos/métricas ficam inválidos
    }
    this.marcarDesatualizado();
  }

  /** Limpa as seleções a jusante dos dados (pré-proc X/y, modelos, métricas e resultados). */
  private resetDownstream(): void {
    this.featCards = []; this.labelCards = []; this.modelCards = []; this.evalCards = [];
    this.resultadoTreinamento = {}; this.resultadosDasAvaliacoes = {};
    this.comparacaoMetricas = []; this.comparacaoModelos = [];
    this.hiperParams = {}; this.fecharInsp();
  }

  private marcarDesatualizado(): void {
    if (Object.keys(this.resultadoTreinamento).length || Object.keys(this.resultadosDasAvaliacoes || {}).length) {
      this.desatualizado = true;
    }
  }

  // ---------- execução: treina N ramos em paralelo, depois avalia todos ----------
  private preProcParaTreino(): { valor: string; colunas: string[] }[] {
    return [...this.featCards, ...this.labelCards].map(c => ({ valor: c.valor, colunas: c.colunas || [] }));
  }

  podeRodar(): boolean {
    return this.temDados && this.modelCards.length > 0 && !this.execRunning
      && !!this.session.getColetaId() && !!this.session.getConfigurcaoTreinamento();
  }

  rodarTrilha(): void {
    if (!this.podeRodar()) { this.flash('Carregue os dados e adicione ao menos um modelo.'); return; }
    const arquivoId = this.session.getColetaId()!;
    const configId = this.session.getConfigurcaoTreinamento()!;
    const preProc = this.preProcParaTreino();

    this.execRunning = true; this.execDone = false; this.desatualizado = false;
    this.execMsg = `Treinando ${this.modelCards.length} modelo(s) em paralelo…`;
    this.modelCards.forEach(c => c.status = 'running');

    const reqs = this.modelCards.map(mc => {
      const body = {
        tipo_arquivo: 'xlsx', arquivo_id: arquivoId, configuracao_id: configId,
        modelo_id: (mc.item as any).id, hiperparametros: this.hiperParaTreino(mc), pre_processamento: preProc,
      };
      return this.dashboard.classificadorTreino(mc.valor, body).pipe(
        catchError(err => of({ __erro: err?.error?.detail || 'falha no treino', __valor: mc.valor })),
      );
    });

    forkJoin(reqs).pipe(takeUntil(this.destroy$)).subscribe((lista: any[]) => {
      this.resultadoTreinamento = {};
      const treinados: any[] = [];
      lista.forEach((res) => {
        // pareia por identidade (valor), não por índice — robusto se a lista mudar
        const valor = res?.__erro ? res.__valor : res?.modelo;
        const mc = this.modelCards.find(c => c.valor === valor);
        if (!mc) return; // card removido durante o treino: ignora com segurança
        if (res?.__erro) { mc.status = 'erro'; mc.short = res.__erro; }
        else {
          mc.status = 'done'; mc.short = `treinado · ${res.total_amostras_treino ?? '?'} amostras`;
          mc.resultado = res; this.resultadoTreinamento[res.modelo] = res; treinados.push(res);
        }
      });
      this.featCards.forEach(c => c.status = 'done');
      this.labelCards.forEach(c => c.status = 'done');
      if (this.evalCards.length && treinados.length) this.avaliar(treinados);
      else { this.execRunning = false; this.concluir(); }
    });
  }

  private avaliar(treinados: any[]): void {
    this.execMsg = 'Avaliando e comparando…';
    this.evalCards.forEach(c => c.status = 'running');
    const body = {
      modelos: treinados.map(r => ({ id: r.id, label: r.nome_modelo })),
      metricas: this.evalCards.map(c => ({ valor: c.valor, label: c.label, average: this.mediaMetricas })),
    };
    this.dashboard.postMetricas(body).pipe(takeUntil(this.destroy$)).subscribe({
      next: (aval: any) => {
        this.resultadosDasAvaliacoes = aval || {};
        this.montarComparacao(aval, treinados);
        this.evalCards.forEach(c => c.status = 'done');
        this.execRunning = false; this.concluir();
      },
      error: (err) => {
        this.execRunning = false;
        this.evalCards.forEach(c => c.status = 'idle');
        this.flash(err?.error?.detail || 'Falha ao avaliar.');
      },
    });
  }

  private montarComparacao(aval: any, treinados: any[]): void {
    this.comparacaoModelos = treinados.map(r => r.nome_modelo);
    // métricas escalares (ignora confusion_matrix/objetos) para a tabela comparativa
    this.comparacaoMetricas = this.evalCards
      .map(c => c.label)
      .filter(label => {
        const linha = aval?.[label];
        if (!linha) return false;
        const algum = Object.values(linha)[0];
        return typeof algum !== 'object';
      });
  }

  valorComparacao(metricaLabel: string, modelo: string): string {
    const v = this.resultadosDasAvaliacoes?.[metricaLabel]?.[modelo];
    if (v === undefined || v === null) return '—';
    return typeof v === 'number' ? v.toFixed(4) : `${v}`;
  }

  // ---------- chat tutor (reusa <app-chat-tutor>) ----------
  chatAberto = false;
  toggleChat(): void { this.chatAberto = !this.chatAberto; }
  perguntarTutor(): void { this.chatAberto = true; }

  get chatContexto(): any {
    const r = this.resultadoColetaDado;
    return {
      item: this.selecionado ? { tipoItem: this.selecionado.fase, valor: this.selecionado.valor, label: this.selecionado.label } : null,
      infoSelecionada: this.inspInfo,
      dataset: r ? { target: r.target, nome: r.nomeDataset || r.treino?.nomeArquivo } : null,
      tarefa: this.taskPillLabel,
      modelos: this.modelCards.map(c => c.label),
      metricas: this.evalCards.map(c => c.label),
      preProcessamento: this.preProcCfg(),
      resultados: this.resultadosDasAvaliacoes,
    };
  }
  get chatSugestoes(): string[] {
    const s = this.selecionado;
    if (!s) return ['O que é um pipeline de ML?', 'Como escolher um modelo?'];
    return [`O que faz ${s.label}?`, `Quando usar ${s.label}?`, `Como interpretar isso?`];
  }

  // ---------- visualizações Yellowbrick (por modelo) ----------
  get visualizacoesPorModelo(): Record<string, any[]> { return this.resultadosDasAvaliacoes?._visualizacoes || {}; }
  get modelosComViz(): string[] {
    const v = this.visualizacoesPorModelo;
    return Object.keys(v).filter(m => (v[m] || []).length > 0);
  }
  imgViz(v: any): string { return `data:${v.mime};base64,${v.base64}`; }

  /** Reagrupa as visualizações por tipo de gráfico (título) para comparar modelos lado a lado:
   *  ex.: matriz de confusão do modelo 1 ao lado da do modelo 2. */
  get vizComparada(): { titulo: string; itens: { modelo: string; viz: any }[] }[] {
    const porModelo = this.visualizacoesPorModelo;
    const modelos = this.modelosComViz;
    const titulos: string[] = [];
    for (const m of modelos) {
      for (const v of (porModelo[m] || [])) {
        if (v?.titulo && !titulos.includes(v.titulo)) titulos.push(v.titulo);
      }
    }
    return titulos.map(titulo => ({
      titulo,
      itens: modelos
        .map(m => ({ modelo: m, viz: (porModelo[m] || []).find((v: any) => v.titulo === titulo) }))
        .filter(x => !!x.viz),
    }));
  }

  // ---------- exportação (modal) ----------
  exportOpen = false;
  exportFormato: 'py' | 'ipynb' = 'py';
  exportComparativo = true;
  exportSel: Record<string, boolean> = {};

  get modelosTreinados(): TrilhaCard[] { return this.modelCards.filter(c => c.status === 'done' && c.resultado); }

  abrirExport(): void {
    if (!this.modelosTreinados.length) { this.flash('Rode a trilha antes de exportar.'); return; }
    this.exportSel = {};
    this.modelosTreinados.forEach(c => this.exportSel[c.valor] = true);
    this.exportFormato = 'py'; this.exportComparativo = true; this.exportOpen = true;
  }
  fecharExport(): void { this.exportOpen = false; }
  toggleExportModelo(v: string): void { this.exportSel[v] = !this.exportSel[v]; }

  get exportArquivos(): string[] {
    const ext = this.exportFormato === 'ipynb' ? 'ipynb' : 'py';
    const arqs = this.modelosTreinados.filter(c => this.exportSel[c.valor]).map(c => `${c.valor}/pipeline.${ext}`);
    if (this.exportComparativo && this.comparacaoMetricas.length) arqs.push('comparacao.csv');
    return arqs;
  }

  async exportar(): Promise<void> {
    const sel = this.modelosTreinados.filter(c => this.exportSel[c.valor]);
    if (!sel.length) { this.flash('Selecione ao menos um modelo.'); return; }
    const ext = this.exportFormato === 'ipynb' ? 'ipynb' : 'py';
    const zip = new JSZip();
    for (const c of sel) {
      const script = this.scriptGen.gerarScriptModelo(
        this.resultadoColetaDado, c.item, this.evalCards.map(e => e.item), this.hiperParaTreino(c), this.preProcCfg(),
      );
      const conteudo = this.exportFormato === 'ipynb' ? this.toNotebook(c.label, script) : script;
      zip.folder(c.valor)!.file(`pipeline.${ext}`, conteudo);
    }
    if (this.exportComparativo && this.comparacaoMetricas.length) zip.file('comparacao.csv', this.comparacaoCsv());
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `trilha_${this.resultadoColetaDado?.nomeDataset || 'modelos'}.zip`);
    this.exportOpen = false;
  }

  private toNotebook(titulo: string, script: string): string {
    const linhas = script.split('\n');
    return JSON.stringify({
      cells: [
        { cell_type: 'markdown', metadata: {}, source: [`# ${titulo}\n`, 'Pipeline gerado pela Trilha de ML (Iana).'] },
        { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source: linhas.map((l, i) => i < linhas.length - 1 ? l + '\n' : l) },
      ],
      metadata: { kernelspec: { name: 'python3', display_name: 'Python 3' }, language_info: { name: 'python' } },
      nbformat: 4, nbformat_minor: 5,
    }, null, 1);
  }
  private comparacaoCsv(): string {
    const head = ['Metrica', ...this.comparacaoModelos].join(',');
    const rows = this.comparacaoMetricas.map(m => [m, ...this.comparacaoModelos.map(mod => this.valorComparacao(m, mod))].join(','));
    return [head, ...rows].join('\n');
  }

  // ---------- persistência (salvar/carregar via PipelineService) ----------
  projetoId?: string;
  projetoNome = '';
  salvarOpen = false;
  projetosOpen = false;
  projetos: PipelineState[] = [];
  salvandoProj = false;

  private montarEstado(): PipelineState {
    return {
      id: this.projetoId,
      nome: this.projetoNome || this.resultadoColetaDado?.nomeDataset || 'Trilha sem nome',
      resultadoColetaDado: this.resultadoColetaDado,
      coletaId: this.session.getColetaId() || undefined,
      configId: this.session.getConfigurcaoTreinamento() || undefined,
      modeloSelecionado: this.modelCards[0]?.item,
      modelosSelecionados: this.modelCards.map(c => c.item),
      metricasSelecionadas: this.evalCards.map(c => c.item),
      mediaMetricas: this.mediaMetricas as any,
      preProcessamentoConfig: this.preProcCfg(),
      resultadoTreinamento: this.resultadoTreinamento,
      resultadosDasAvaliacoes: this.resultadosDasAvaliacoes,
    };
  }

  abrirSalvar(): void {
    if (!this.temDados) { this.flash('Monte a trilha antes de salvar.'); return; }
    this.projetoNome = this.projetoNome || this.resultadoColetaDado?.nomeDataset || '';
    this.salvarOpen = true;
  }
  fecharSalvar(): void { this.salvarOpen = false; }
  confirmarSalvar(): void {
    const nome = (this.projetoNome || '').trim();
    if (!nome) { this.flash('Dê um nome ao projeto.'); return; }
    this.salvandoProj = true;
    const estado = this.montarEstado(); estado.nome = nome;
    this.pipelineSvc.salvarPipeline(estado).pipe(takeUntil(this.destroy$)).subscribe({
      next: (saved: any) => { this.projetoId = saved?.id || this.projetoId; this.salvandoProj = false; this.salvarOpen = false; this.flash('Projeto salvo.'); },
      error: (err) => { this.salvandoProj = false; this.flash(err?.error?.detail || 'Falha ao salvar.'); },
    });
  }

  abrirProjetos(): void {
    this.pipelineSvc.listarPipelines().pipe(takeUntil(this.destroy$)).subscribe({
      next: (lista) => { this.projetos = lista || []; this.projetosOpen = true; },
      error: () => this.flash('Falha ao listar projetos.'),
    });
  }
  fecharProjetos(): void { this.projetosOpen = false; }
  excluirProjeto(p: PipelineState, ev: Event): void {
    ev.stopPropagation();
    if (!p.id) return;
    this.pipelineSvc.excluirPipeline(p.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.projetos = this.projetos.filter(x => x.id !== p.id); },
    });
  }
  carregarProjeto(p: PipelineState): void {
    if (!p.id) return;
    this.pipelineSvc.carregarPipeline(p.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (estado) => { if (estado) this.mapToTrilha(estado); this.projetosOpen = false; },
      error: () => this.flash('Falha ao abrir o projeto.'),
    });
  }

  /** Reconstrói a trilha a partir de uma PipelineState salva (mesmo projeto nas duas visões). */
  private mapToTrilha(s: PipelineState): void {
    this.recomecar();
    this.projetoId = s.id; this.projetoNome = s.nome || '';
    this.resultadoColetaDado = s.resultadoColetaDado;
    if (s.coletaId) this.session.setColetaId(s.coletaId);
    if (s.configId) this.session.setConfigurcaoTreinamento(s.configId);
    if (this.resultadoColetaDado) {
      const r = this.resultadoColetaDado;
      const nome = r.nomeDataset || r.treino?.nomeArquivo || 'Dados';
      this.dataCards = [{ uid: this.uid(), fase: 'data', valor: 'dados', label: nome, short: r.target ? `alvo: ${r.target}` : 'dados', item: { valor: 'dados', label: nome } as any, status: 'done' }];
      this.splitCard = this.montarSplitCard(r);
    }
    for (const it of (s.preProcessamentoConfig?.itens || [])) {
      const cat = this.catPreProc.find(p => p.valor === it.valor);
      const escopo = cat ? this.escopoPreProc(cat) : (it.valor === 'label_encoder' ? 'encode_y' : 'transform_X');
      const card: TrilhaCard = { uid: this.uid(), fase: escopo === 'encode_y' ? 'labelY' : 'featX', valor: it.valor, label: it.label || cat?.label || it.valor, short: cat?.resumo, item: (cat || { valor: it.valor, label: it.label }) as any, status: 'idle', colunas: it.colunas || [] };
      if (card.fase === 'labelY') this.labelCards.push(card); else this.featCards.push(card);
    }
    const modelos = (s.modelosSelecionados && s.modelosSelecionados.length) ? s.modelosSelecionados : (s.modeloSelecionado ? [s.modeloSelecionado] : []);
    for (const m of modelos) {
      const card: TrilhaCard = { uid: this.uid(), fase: 'model', valor: m.valor, label: m.label || m.valor, short: (m as any).resumo, item: m, status: 'idle' };
      this.carregarHiperParams(card); this.modelCards.push(card);
    }
    for (const me of (s.metricasSelecionadas || [])) {
      this.evalCards.push({ uid: this.uid(), fase: 'eval', valor: me.valor, label: me.label || me.valor, short: (me as any).resumo, item: me, status: 'idle' });
    }
    this.mediaMetricas = (s.mediaMetricas as any) || 'weighted';
    this.resultadoTreinamento = s.resultadoTreinamento || {};
    this.resultadosDasAvaliacoes = s.resultadosDasAvaliacoes || {};
    Object.keys(this.resultadoTreinamento).forEach(v => {
      const mc = this.modelCards.find(c => c.valor === v);
      if (mc) { mc.status = 'done'; mc.resultado = this.resultadoTreinamento[v]; }
    });
    if (Object.keys(this.resultadosDasAvaliacoes).length) {
      this.montarComparacao(this.resultadosDasAvaliacoes, Object.values(this.resultadoTreinamento));
    }
  }

  private concluir(): void { this.execDone = true; setTimeout(() => this.execDone = false, 2600); }
  private flash(msg: string): void { this.execMsg = msg; this.execRunning = false; this.avisando = true; setTimeout(() => this.avisando = false, 2600); }

  recomecar(): void {
    if (this.execRunning) return;
    this.resultadoColetaDado = undefined;
    this.dataCards = []; this.splitCard = null; this.featCards = []; this.labelCards = [];
    this.modelCards = []; this.evalCards = [];
    this.resultadoTreinamento = {}; this.resultadosDasAvaliacoes = {};
    this.comparacaoMetricas = []; this.comparacaoModelos = [];
    this.execRunning = false; this.execDone = false; this.desatualizado = false;
    this.hiperParams = {}; this.fecharInsp(); this.chatAberto = false;
    this.projetoId = undefined; this.projetoNome = '';
  }
}
