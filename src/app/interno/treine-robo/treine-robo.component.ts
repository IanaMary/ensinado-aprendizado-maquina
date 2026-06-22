import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardService } from '../../dashboard/services/dashboard.service';
import { AtividadeService } from '../../service/atividade/atividade.service';

type Fase = 'build' | 'training' | 'done';
type Sentido = 'sharp' | 'skip';
type Tarefa = 'classificacao' | 'regressao' | 'agrupamento';

interface DatasetLudico { id: string; toy: string; emoji: string; nome: string; dica: string; cor: string; sk: string; tipo: Tarefa; pontoEmoji?: string; }
interface CerebroLudico { id: string; valor: string; emoji: string; nome: string; dica: string; cor: string; sk: string; hiper?: Record<string, any>; }

/**
 * "Treine seu Robô" — porta de entrada lúdica (ensino fundamental). Wizard guiado
 * (Missão → Sentidos → Cérebro → Treinar) com mascote robô. TREINO REAL via backend.
 * Cobre três tipos de tarefa: classificação (acertar a categoria), regressão
 * (adivinhar um número) e agrupamento (separar em grupinhos) — o wizard se adapta
 * ao tipo do dataset escolhido.
 */
@Component({
  selector: 'app-treine-robo',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './treine-robo.component.html',
  styleUrls: ['./treine-robo.component.scss'],
})
export class TreineRoboComponent implements OnInit {
  robotName = 'Léo';
  acc = '#7C3AED';

  // missões agrupadas por tipo de tarefa
  GRUPOS: { tarefa: Tarefa; titulo: string; emoji: string; datasets: DatasetLudico[] }[] = [
    {
      tarefa: 'classificacao', titulo: 'Adivinhar a categoria', emoji: '🎯',
      datasets: [
        { id: 'flores', toy: 'iris', emoji: '🌸', nome: 'Flores', dica: 'reconhecer 3 tipos de flor', cor: '#EC4899', sk: 'load_iris()', tipo: 'classificacao' },
        { id: 'bebidas', toy: 'wine', emoji: '🍷', nome: 'Bebidas', dica: 'descobrir o tipo da bebida', cor: '#A855F7', sk: 'load_wine()', tipo: 'classificacao' },
        { id: 'exames', toy: 'breast_cancer', emoji: '🩺', nome: 'Exames', dica: 'separar exames em dois grupos', cor: '#38BDF8', sk: 'load_breast_cancer()', tipo: 'classificacao' },
      ],
    },
    {
      tarefa: 'regressao', titulo: 'Adivinhar um número', emoji: '🔢',
      datasets: [
        { id: 'cachorro', toy: 'gen_cachorro', emoji: '🐶', nome: 'Cachorros', dica: 'descobrir o peso do cachorro pela altura dele', cor: '#A16207', sk: 'load_cachorro()', tipo: 'regressao', pontoEmoji: '🐶' },
        { id: 'sorvete', toy: 'gen_sorvete', emoji: '🍦', nome: 'Sorvetes', dica: 'quantos sorvetes vão vender?', cor: '#F97316', sk: 'load_sorvete()', tipo: 'regressao' },
        { id: 'crescimento', toy: 'gen_regression', emoji: '📈', nome: 'Crescimento', dica: 'prever um valor que sobe e desce', cor: '#0EA5E9', sk: 'make_regression()', tipo: 'regressao' },
      ],
    },
    {
      tarefa: 'agrupamento', titulo: 'Separar em grupinhos', emoji: '🧩',
      datasets: [
        { id: 'cardume', toy: 'gen_cardume', emoji: '🐠', nome: 'Cardume', dica: 'juntar peixinhos parecidos', cor: '#14B8A6', sk: 'load_cardume()', tipo: 'agrupamento' },
        { id: 'baloes', toy: 'gen_blobs', emoji: '🎈', nome: 'Balões', dica: 'achar nuvens de pontos', cor: '#8B5CF6', sk: 'make_blobs()', tipo: 'agrupamento' },
      ],
    },
  ];

  // cérebros (modelos) por tipo de tarefa
  CEREBROS: Record<Tarefa, CerebroLudico[]> = {
    classificacao: [
      { id: 'floresta', valor: 'random_forest', emoji: '🌳', nome: 'Floresta Mágica', dica: 'muitas arvorezinhas votam juntas', cor: '#22C55E', sk: 'RandomForestClassifier()' },
      { id: 'arvore', valor: 'arvore_decisao', emoji: '🌲', nome: 'Árvore de Perguntas', dica: 'faz perguntas sim/não até decidir', cor: '#14B8A6', sk: 'DecisionTreeClassifier()' },
      { id: 'vizinhos', valor: 'knn', emoji: '👯', nome: 'Os Vizinhos', dica: 'olha quem é mais parecido', cor: '#F59E0B', sk: 'KNeighborsClassifier()' },
    ],
    regressao: [
      { id: 'reta', valor: 'regressao_linear', emoji: '📏', nome: 'Reta Mágica', dica: 'traça uma linha pelo meio dos pontos', cor: '#3B82F6', sk: 'LinearRegression()' },
      { id: 'vizinhos_r', valor: 'knn_regressor', emoji: '👯', nome: 'Os Vizinhos', dica: 'olha os pontos mais perto', cor: '#F59E0B', sk: 'KNeighborsRegressor()' },
      { id: 'firme', valor: 'ridge', emoji: '🛡️', nome: 'Reta Firme', dica: 'uma reta que não exagera', cor: '#14B8A6', sk: 'Ridge()' },
    ],
    agrupamento: [
      { id: 'g2', valor: 'k_means', emoji: '✌️', nome: '2 grupinhos', dica: 'separar em 2 turminhas', cor: '#22C55E', sk: 'KMeans(n_clusters=2)', hiper: { n_clusters: 2 } },
      { id: 'g3', valor: 'k_means', emoji: '🖐️', nome: '3 grupinhos', dica: 'separar em 3 turminhas', cor: '#A855F7', sk: 'KMeans(n_clusters=3)', hiper: { n_clusters: 3 } },
      { id: 'g4', valor: 'k_means', emoji: '✋', nome: '4 grupinhos', dica: 'separar em 4 turminhas', cor: '#F59E0B', sk: 'KMeans(n_clusters=4)', hiper: { n_clusters: 4 } },
    ],
  };

  // estado do wizard
  datasetId: string | null = null;
  senses: Sentido | null = null;
  brainId: string | null = null;
  fase: Fase = 'build';
  carregandoDados = false;
  erro = '';
  showMistakes = false;
  showCode = false;

  // dados/resultados reais
  coleta: any = null;
  modelosCat: any[] = [];
  score = 0;                   // 0..1 (define as estrelas)
  matriz: { matriz: number[][]; classes: string[]; total: number } | null = null;  // classificação
  r2: number | null = null;    // regressão
  mae: number | null = null;   // regressão
  silhouette: number | null = null; // agrupamento
  // scatter próprio (lúdico) a partir dos dados reais do dataset
  scatterPontos: { cx: number; cy: number; cor: string; emoji?: string; tam?: number }[] = [];
  scatterLinha: { x1: number; y1: number; x2: number; y2: number } | null = null;
  readonly SVG_W = 320; readonly SVG_H = 188; readonly PAD = 18;
  CORES_GRUPO = ['#7C3AED', '#EC4899', '#F59E0B', '#22C55E', '#38BDF8'];
  NOMES_GRUPO = ['roxo', 'rosa', 'laranja', 'verde', 'azul'];

  // ---- "Mostra que eu adivinho!" (usar o robô depois de treinar) ----
  modeloTreinadoId: string | null = null;
  brincando = false;
  prevendo = false;
  previu = false;
  features: { col: string; min: number; max: number; step: number }[] = [];
  inputs: Record<string, number> = {};
  predicao: any = null;

  // ---- "Desafiar o Léo!" (criança × robô) — só classificação ----
  desafiando = false;
  desafioFim = false;
  aguardandoLeo = false;
  readonly N_CARTAS = 5;
  deck: { valores: Record<string, number>; verdadeiro: string; kid: string | null; leo: string | null }[] = [];
  cartaIdx = 0;
  kidScore = 0;
  leoScore = 0;

  constructor(
    private dashboard: DashboardService,
    private router: Router,
    private atividade: AtividadeService,
  ) {}

  ngOnInit(): void {
    this.dashboard.fetchItensModelos().subscribe({
      next: (m: any[]) => (this.modelosCat = m || []),
      error: () => (this.modelosCat = []),
    });
  }

  voltarInicio(): void { this.router.navigate(['/inicio']); }

  // ---------- helpers de catálogo ----------
  get todosDatasets(): DatasetLudico[] { return this.GRUPOS.flatMap(g => g.datasets); }
  get dataset(): DatasetLudico | null { return this.todosDatasets.find(d => d.id === this.datasetId) || null; }
  get tarefa(): Tarefa | null { return this.dataset?.tipo || null; }
  get cerebrosDisponiveis(): CerebroLudico[] { return this.tarefa ? this.CEREBROS[this.tarefa] : []; }
  get cerebro(): CerebroLudico | null { return this.cerebrosDisponiveis.find(c => c.id === this.brainId) || null; }

  get step(): 'mission' | 'senses' | 'brain' | 'ready' {
    if (!this.datasetId) return 'mission';
    if (this.senses === null) return 'senses';
    if (!this.brainId) return 'brain';
    return 'ready';
  }

  // ---------- escolhas ----------
  escolherDataset(d: DatasetLudico): void {
    if (this.carregandoDados) return;
    this.atividade.registrar('pipeline', 'escolheu_dataset', { contexto: 'treine-robo', dataset: d.id, toy: d.toy });
    this.carregandoDados = true; this.erro = ''; this.coleta = null;
    this.dashboard.carregarToyDataset(d.toy).subscribe({
      next: (res: any) => { this.coleta = res; this.datasetId = d.id; this.carregandoDados = false; },
      error: () => { this.carregandoDados = false; this.erro = 'Ops! Não consegui carregar esses dados. Tenta de novo? 🙈'; },
    });
  }
  escolherSentido(s: Sentido): void { this.senses = s; }
  escolherCerebro(c: CerebroLudico): void { this.brainId = c.id; }

  // ---------- treino real ----------
  treinar(): void {
    if (this.fase === 'training' || !this.coleta || !this.cerebro) return;
    const modeloItem = this.modelosCat.find(m => m.valor === this.cerebro!.valor);
    if (!modeloItem) { this.erro = 'Esse cérebro não está disponível agora. 🙈'; return; }
    this.atividade.iniciarAcao('robo_treino');
    this.fase = 'training'; this.showMistakes = false; this.showCode = false; this.erro = '';
    this.matriz = null; this.r2 = null; this.mae = null; this.silhouette = null;
    this.scatterPontos = []; this.scatterLinha = null;
    this.brincando = false; this.previu = false; this.predicao = null; this.modeloTreinadoId = null;
    this.desafiando = false; this.desafioFim = false; this.aguardandoLeo = false; this.deck = []; this.cartaIdx = 0; this.kidScore = 0; this.leoScore = 0;
    const body = {
      tipo_arquivo: 'xlsx',
      arquivo_id: this.coleta.id_coleta,
      configuracao_id: this.coleta.id_configuracoes_treinamento,
      modelo_id: modeloItem.id,
      hiperparametros: this.cerebro.hiper || {},
      pre_processamento: this.senses === 'sharp' ? [{ valor: 'minmax_scaler' }] : [],
    };
    this.dashboard.classificadorTreino(this.cerebro.valor, body).subscribe({
      next: (treino: any) => this.avaliar(treino),
      error: (e) => this.falhaTreino(e),
    });
  }

  private avaliar(treino: any): void {
    this.modeloTreinadoId = treino?.id || null;
    const t = this.tarefa;
    const metricas =
      t === 'regressao' ? [{ valor: 'r2_score', label: 'r2' }, { valor: 'mean_absolute_error', label: 'mae' }]
      : t === 'agrupamento' ? [{ valor: 'silhouette_score', label: 'sil' }]
      : [{ valor: 'accuracy_score', label: 'acuracia', average: 'weighted' }, { valor: 'confusion_matrix', label: 'matriz' }];
    const body = { modelos: [{ id: treino.id, label: treino.nome_modelo }], metricas };
    this.dashboard.postMetricas(body).subscribe({
      next: (aval: any) => {
        this.parseResultado(aval, treino.nome_modelo);
        this.fase = 'done';
        this.atividade.finalizarAcao('robo_treino',
          { contexto: 'treine-robo', cerebro: this.cerebro?.valor, tarefa: this.tarefa, score: this.score },
          { acao: 'treinou_modelo' });
      },
      error: (e) => this.falhaTreino(e),
    });
  }

  private parseResultado(aval: any, nome: string): void {
    const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : null);
    if (this.tarefa === 'regressao') {
      this.r2 = num(aval?.['r2']?.[nome]);
      this.mae = num(aval?.['mae']?.[nome]);
      this.score = Math.max(0, Math.min(1, this.r2 ?? 0));
      this.montarScatter();
    } else if (this.tarefa === 'agrupamento') {
      this.silhouette = num(aval?.['sil']?.[nome]);
      this.score = Math.max(0, Math.min(1, ((this.silhouette ?? 0) + 1) / 2));
      this.montarScatter();
    } else {
      const acc = num(aval?.['acuracia']?.[nome]);
      this.score = acc ?? 0;
      const mz = aval?.['matriz']?.[nome];
      this.matriz = mz && Array.isArray(mz.matriz) ? mz : null;
    }
  }

  /** Desenha um scatter lúdico a partir dos dados reais do dataset (preview).
   *  Regressão: (feature × alvo) + a reta do padrão (mínimos quadrados).
   *  Agrupamento: (feature1 × feature2) com os pontos coloridos por grupinho
   *  (k-means leve no cliente só para colorir — a qualidade vem do backend). */
  private montarScatter(): void {
    this.scatterPontos = []; this.scatterLinha = null;
    const linhas: any[] = this.coleta?.dados || [];
    const cols: string[] = this.coleta?.colunas || [];
    const target = this.coleta?.target;
    let xKey: string | undefined, yKey: string | undefined;
    if (this.tarefa === 'regressao') { yKey = target; xKey = cols.find(c => c !== target); }
    else { const feats = cols.filter(c => c !== target); xKey = feats[0]; yKey = feats[1] || feats[0]; }
    if (!xKey || !yKey) return;

    const pts: number[][] = [];
    for (const r of linhas) {
      const x = Number(r[xKey]), y = Number(r[yKey]);
      if (isFinite(x) && isFinite(y)) pts.push([x, y]);
    }
    if (pts.length < 2) return;

    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    const W = this.SVG_W, H = this.SVG_H, P = this.PAD;
    const sx = (x: number) => P + (xmax === xmin ? 0.5 : (x - xmin) / (xmax - xmin)) * (W - 2 * P);
    const sy = (y: number) => H - P - (ymax === ymin ? 0.5 : (y - ymin) / (ymax - ymin)) * (H - 2 * P);

    let labels: number[] = pts.map(() => 0);
    if (this.tarefa === 'agrupamento') labels = this.kmeansLeve(pts, Math.max(2, this.nGrupos));

    // Regressão temática: figuras (ex.: 🐶) que crescem conforme o valor (eixo y) sobe.
    const pe = this.tarefa === 'regressao' ? this.dataset?.pontoEmoji : undefined;
    this.scatterPontos = pts.map((p, i) => {
      const ponto: { cx: number; cy: number; cor: string; emoji?: string; tam?: number } = {
        cx: sx(p[0]), cy: sy(p[1]),
        cor: this.tarefa === 'agrupamento' ? this.CORES_GRUPO[labels[i] % this.CORES_GRUPO.length] : '#A855F7',
      };
      if (pe) {
        const norm = ymax === ymin ? 0.5 : (p[1] - ymin) / (ymax - ymin);
        ponto.emoji = pe;
        ponto.tam = 13 + 26 * norm;   // pequeno embaixo, grande no alto da linha
      }
      return ponto;
    });

    if (this.tarefa === 'regressao') {
      const n = pts.length; let sX = 0, sY = 0, sXY = 0, sXX = 0;
      for (const [x, y] of pts) { sX += x; sY += y; sXY += x * y; sXX += x * x; }
      const den = n * sXX - sX * sX;
      if (den !== 0) {
        const m = (n * sXY - sX * sY) / den, b = (sY - m * sX) / n;
        this.scatterLinha = { x1: sx(xmin), y1: sy(m * xmin + b), x2: sx(xmax), y2: sy(m * xmax + b) };
      }
    }
  }

  /** k-means 2D leve e determinístico (centróides iniciais espalhados) — só p/ colorir. */
  private kmeansLeve(pts: number[][], k: number, iters = 8): number[] {
    if (pts.length <= k) return pts.map((_, i) => i % k);
    const cents = Array.from({ length: k }, (_, i) => pts[Math.floor(i * (pts.length - 1) / (k - 1))].slice());
    const labels = new Array(pts.length).fill(0);
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < pts.length; i++) {
        let best = 0, bd = Infinity;
        for (let c = 0; c < k; c++) { const dx = pts[i][0] - cents[c][0], dy = pts[i][1] - cents[c][1]; const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; } }
        labels[i] = best;
      }
      const acc = Array.from({ length: k }, () => [0, 0, 0]);
      for (let i = 0; i < pts.length; i++) { const c = labels[i]; acc[c][0] += pts[i][0]; acc[c][1] += pts[i][1]; acc[c][2]++; }
      for (let c = 0; c < k; c++) { if (acc[c][2]) { cents[c][0] = acc[c][0] / acc[c][2]; cents[c][1] = acc[c][1] / acc[c][2]; } }
    }
    return labels;
  }

  private falhaTreino(e: any): void {
    this.fase = 'build';
    this.erro = e?.error?.detail || 'O robô ficou confuso no treino. Tenta de novo! 🙈';
    this.atividade.finalizarAcao('robo_treino', { contexto: 'treine-robo' },
      { acao: 'treinou_modelo', status: 'erro', erro: e?.error?.detail || 'falha no treino' });
  }

  recomecar(): void {
    this.datasetId = null; this.senses = null; this.brainId = null; this.fase = 'build';
    this.score = 0; this.matriz = null; this.r2 = null; this.mae = null; this.silhouette = null;
    this.scatterPontos = []; this.scatterLinha = null;
    this.brincando = false; this.previu = false; this.predicao = null; this.modeloTreinadoId = null;
    this.desafiando = false; this.desafioFim = false; this.aguardandoLeo = false; this.deck = []; this.cartaIdx = 0; this.kidScore = 0; this.leoScore = 0;
    this.showMistakes = false; this.showCode = false; this.erro = ''; this.coleta = null;
  }

  // ---------- humor / mascote ----------
  get mood(): 'idle' | 'happy' | 'thinking' | 'celebrate' {
    if (this.fase === 'training' || this.prevendo || this.aguardandoLeo) return 'thinking';
    if (this.desafiando) return this.desafioFim ? 'celebrate' : 'happy';
    if (this.brincando) return this.previu ? 'celebrate' : 'happy';
    if (this.fase === 'done') return 'celebrate';
    if (this.datasetId) return 'happy';
    return 'idle';
  }
  get chestGlyph(): string { return this.mood === 'celebrate' ? '⭐' : (this.mood === 'thinking' ? '⚙️' : '💜'); }
  starPts(cx: number, cy: number, outer = 9, inner = 4): string {
    let p = '';
    for (let i = 0; i < 10; i++) { const ang = Math.PI / 5 * i - Math.PI / 2; const r = i % 2 === 0 ? outer : inner; p += (cx + r * Math.cos(ang)).toFixed(1) + ',' + (cy + r * Math.sin(ang)).toFixed(1) + ' '; }
    return p.trim();
  }

  // ---------- ilhas de progresso ----------
  get islands() {
    const s = this.step;
    return [
      { label: 'Missão', icon: '🎯', done: !!this.datasetId, cur: s === 'mission' },
      { label: 'Sentidos', icon: '👀', done: this.senses !== null, cur: s === 'senses' },
      { label: 'Cérebro', icon: '🧠', done: !!this.brainId, cur: s === 'brain' },
      { label: 'Treinar', icon: '🚀', done: this.fase === 'done', cur: s === 'ready' || this.fase === 'training' },
    ];
  }

  // ---------- placar ----------
  get pct(): number { return Math.round(this.score * 100); }
  get nStars(): number { return Math.max(1, Math.round(this.score * 5)); }
  get stars(): string[] { return [0, 1, 2, 3, 4].map(i => (i < this.nStars ? '⭐' : '☆')); }
  get scoreCap(): string {
    return this.tarefa === 'regressao' ? 'de acerto no padrão'
      : this.tarefa === 'agrupamento' ? 'de qualidade na separação'
      : 'de acerto';
  }
  get scoreMsg(): string {
    const p = this.pct, n = this.robotName;
    return p >= 90 ? `Uau! O ${n} ficou craque! 🏆` : p >= 75 ? `Muito bem! O ${n} aprendeu bastante! 🎉` : `Boa! Dá pra treinar mais e melhorar! 💪`;
  }

  // ---------- falas ----------
  get sayText(): string {
    const n = this.robotName;
    if (this.desafiando) {
      if (this.aguardandoLeo) return 'Hmm, deixa eu adivinhar... 🤔';
      if (this.desafioFim) return this.desafioMsgFinal;
      if (this.cartaRevelada) return 'E aí, quem acertou? 👀';
      return 'Sua vez! Qual a categoria desse exemplo? 🎲';
    }
    if (this.prevendo) return 'Deixa eu pensar... 🤔';
    if (this.brincando) return this.previu ? this.predicaoTexto : (this.erro || 'Me mostra um exemplo e eu adivinho! 🔮');
    if (this.fase === 'training') return 'Deixa comigo, tô aprendendo! 🧠';
    if (this.fase === 'done') return this.scoreMsg;
    if (this.erro) return this.erro;
    switch (this.step) {
      case 'mission': return `Oi! Eu sou o robô ${n} 🤖 O que você quer me ensinar?`;
      case 'senses': return 'Boa escolha! Quer afinar meus sentidos antes?';
      case 'brain':
        return this.tarefa === 'agrupamento' ? 'Em quantos grupinhos eu separo?'
          : this.tarefa === 'regressao' ? 'Como eu vou adivinhar o número?'
          : 'Agora escolhe meu cérebro! Como eu devo pensar?';
      default: return 'Tô prontíssimo pra aprender! 🎉';
    }
  }
  get hintText(): string {
    if (this.erro) return '';
    switch (this.step) {
      case 'mission': return 'Toque numa missão pra começar a aventura!';
      case 'senses': return 'Isso deixa tudo na mesma medida pra eu enxergar melhor (os robôs gostam disso!).';
      case 'brain': return 'Cada jeito aprende diferente. Pode experimentar!';
      default: return '';
    }
  }
  get showOptions(): boolean { return this.fase === 'build' && this.step !== 'ready'; }
  get showReady(): boolean { return this.fase === 'build' && this.step === 'ready'; }
  get optionsSenses() {
    return [
      { id: 'sharp', emoji: '✨', nome: 'Sim, afinar!', dica: 'deixa tudo certinho na mesma escala', cor: '#A855F7' },
      { id: 'skip', emoji: '⏭️', nome: 'Pode pular', dica: 'vamos direto pro treino', cor: '#94A3B8' },
    ];
  }

  // ---------- resultado adaptado por tarefa ----------
  // classificação: "o que ele respondeu" a partir da matriz de confusão real
  get linhasMatriz() {
    if (!this.matriz) return [];
    const { matriz, classes } = this.matriz;
    return classes.map((c, i) => {
      const linha = matriz[i] || [];
      const total = linha.reduce((a, b) => a + b, 0);
      const certo = linha[i] || 0;
      return { classe: c, total, certo, errado: total - certo };
    });
  }
  // regressão: erro médio amigável
  get maeFmt(): string { return this.mae == null ? '—' : (Math.abs(this.mae) >= 100 ? Math.round(this.mae).toString() : this.mae.toFixed(1)); }
  // agrupamento: quantos grupinhos
  get nGrupos(): number { return (this.cerebro?.hiper?.['n_clusters'] as number) || 0; }

  // ---------- "Mostra que eu adivinho!" ----------
  rotulo(col: string): string { return (col || '').replace(/_/g, ' '); }

  abrirBrincar(): void {
    this.montarFeatures();
    this.inputs = {}; this.predicao = null; this.previu = false;
    this.semear();
    this.brincando = true;
  }
  fecharBrincar(): void { this.brincando = false; this.predicao = null; this.previu = false; }
  surpresa(): void { this.predicao = null; this.previu = false; this.semear(); }

  adivinhar(): void {
    if (this.prevendo || !this.modeloTreinadoId) return;
    this.prevendo = true; this.previu = false; this.predicao = null; this.erro = '';
    this.dashboard.classificadorPrever({ modelo_id: this.modeloTreinadoId, valores: this.inputs }).subscribe({
      next: (res: any) => { this.predicao = res?.predicao; this.previu = true; this.prevendo = false; },
      error: (e) => { this.prevendo = false; this.erro = e?.error?.detail || 'Não consegui adivinhar agora. Tenta de novo? 🙈'; },
    });
  }

  private montarFeatures(): void {
    this.features = [];
    const linhas: any[] = this.coleta?.dados || [];
    const cols: string[] = this.coleta?.colunas || [];
    const target = this.coleta?.target;
    for (const col of cols.filter(c => c !== target)) {
      const vals = linhas.map(r => Number(r[col])).filter(v => isFinite(v));
      if (!vals.length) continue;
      let min = Math.min(...vals), max = Math.max(...vals);
      if (min === max) { min -= 1; max += 1; }
      const step = (max - min) / 100 || 0.1;
      this.features.push({ col, min: +min.toFixed(2), max: +max.toFixed(2), step: +step.toFixed(3) });
    }
  }
  private semear(): void {
    const linhas: any[] = this.coleta?.dados || [];
    const row = linhas.length ? linhas[Math.floor(Math.random() * linhas.length)] : null;
    for (const f of this.features) {
      const v = row ? Number(row[f.col]) : (f.min + f.max) / 2;
      this.inputs[f.col] = isFinite(v) ? +v.toFixed(2) : +(((f.min + f.max) / 2)).toFixed(2);
    }
  }

  get predicaoTexto(): string {
    if (this.predicao == null) return '';
    if (this.tarefa === 'regressao') return `Acho que vai dar ~${Math.round(Number(this.predicao))}! 🎉`;
    if (this.tarefa === 'agrupamento') { const i = Number(this.predicao); return `Esse é do grupinho ${this.NOMES_GRUPO[i % this.NOMES_GRUPO.length]}! 🎉`; }
    return `Acho que é ${this.predicao}! 🎉`;
  }
  get predicaoCor(): string {
    const i = Number(this.predicao);
    return this.tarefa === 'agrupamento' && isFinite(i) ? this.CORES_GRUPO[i % this.CORES_GRUPO.length] : '';
  }

  // ---------- "Desafiar o Léo!" (criança × robô) ----------
  /** Normaliza um valor para o espaço de rótulos reais do modelo (matriz.classes). */
  private aClasse(v: any): string {
    const classes = this.matriz?.classes || [];
    if (v === null || v === undefined) return '';
    const s = String(v).trim();
    if (classes.includes(s)) return s;
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n < classes.length) return classes[n];
    return s;
  }

  get podeDesafiar(): boolean {
    return this.fase === 'done' && this.tarefa === 'classificacao'
      && !!this.modeloTreinadoId && (this.matriz?.classes?.length || 0) > 1
      && (this.coleta?.dados?.length || 0) > 0;
  }

  abrirDesafio(): void {
    if (!this.podeDesafiar) return;
    const linhas: any[] = this.coleta?.dados || [];
    const cols: string[] = this.coleta?.colunas || [];
    const target = this.coleta?.target;
    const feats = cols.filter(c => c !== target);
    // sorteia até N linhas reais distintas (embaralha índices)
    const idxs = linhas.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idxs[i], idxs[j]] = [idxs[j], idxs[i]]; }
    this.deck = idxs.slice(0, Math.min(this.N_CARTAS, linhas.length)).map(i => {
      const r = linhas[i];
      const valores: Record<string, number> = {};
      for (const c of feats) { const v = Number(r[c]); if (isFinite(v)) valores[c] = +v.toFixed(2); }
      return { valores, verdadeiro: this.aClasse(r[target]), kid: null, leo: null };
    });
    this.cartaIdx = 0; this.kidScore = 0; this.leoScore = 0;
    this.desafioFim = false; this.aguardandoLeo = false;
    this.brincando = false; this.previu = false; this.predicao = null; this.erro = '';
    this.desafiando = true;
  }

  fecharDesafio(): void { this.desafiando = false; this.desafioFim = false; this.aguardandoLeo = false; }
  jogarDeNovo(): void { this.abrirDesafio(); }

  palpitarCrianca(classe: string): void {
    const carta = this.cartaAtual;
    if (!carta || carta.kid !== null || this.aguardandoLeo || !this.modeloTreinadoId) return;
    carta.kid = classe;
    if (classe === carta.verdadeiro) this.kidScore++;
    this.aguardandoLeo = true;
    this.dashboard.classificadorPrever({ modelo_id: this.modeloTreinadoId, valores: carta.valores }).subscribe({
      next: (res: any) => {
        carta.leo = this.aClasse(res?.predicao);
        if (carta.leo === carta.verdadeiro) this.leoScore++;
        this.aguardandoLeo = false;
      },
      error: () => { carta.leo = '?'; this.aguardandoLeo = false; },
    });
  }

  proximaCarta(): void {
    if (this.aguardandoLeo) return;
    this.cartaIdx++;
    if (this.cartaIdx >= this.deck.length) this.desafioFim = true;
  }

  get cartaAtual() { return this.deck[this.cartaIdx] || null; }
  get classesDesafio(): string[] { return this.matriz?.classes || []; }
  get cartaPistas(): { rotulo: string; valor: number }[] {
    const c = this.cartaAtual; if (!c) return [];
    return Object.keys(c.valores).map(k => ({ rotulo: this.rotulo(k), valor: c.valores[k] }));
  }
  get cartaRevelada(): boolean { return !!this.cartaAtual && this.cartaAtual.leo !== null; }
  get desafioMsgFinal(): string {
    const k = this.kidScore, l = this.leoScore, n = this.robotName;
    if (k > l) return `Você venceu o ${n}! 🏆 Mandou muito bem!`;
    if (l > k) return `O ${n} levou essa! 🤖 Treina mais e desafia de novo!`;
    return `Empate! Você e o ${n} ficaram igualzinhos! 🤝`;
  }

  // ---------- código (blocos + python por tarefa) ----------
  get scratchBlocks() {
    const d = this.dataset, c = this.cerebro;
    if (this.fase !== 'done' || !d || !c) return [];
    const b: any[] = [{ emoji: d.emoji, text: 'usar dados de ' + d.nome, cor: '#4C97FF' }];
    if (this.senses === 'sharp') b.push({ emoji: '📏', text: 'deixar na mesma medida', cor: '#9966FF' });
    if (this.tarefa === 'agrupamento') {
      b.push({ emoji: c.emoji, text: 'separar em ' + this.nGrupos + ' grupinhos', cor: '#59C059' });
      b.push({ emoji: '✨', text: 'mostrar a qualidade', cor: '#FF8C1A' });
    } else if (this.tarefa === 'regressao') {
      b.push({ emoji: c.emoji, text: 'treinar ' + c.nome, cor: '#59C059' });
      b.push({ emoji: '🎯', text: 'ver o quão perto chegou', cor: '#FF8C1A' });
    } else {
      b.push({ emoji: c.emoji, text: 'treinar ' + c.nome, cor: '#59C059' });
      b.push({ emoji: '🎯', text: 'mostrar o acerto', cor: '#FF8C1A' });
    }
    return b;
  }
  get codeLines(): string[] {
    const d = this.dataset, c = this.cerebro;
    if (this.fase !== 'done' || !d || !c) return [];
    const escala = this.senses === 'sharp' ? 'X = MinMaxScaler().fit_transform(X)' : '# (sem ajustar a escala)';
    if (this.tarefa === 'agrupamento') {
      return [
        'from sklearn import *',
        'X = ' + d.sk,
        escala,
        'modelo = ' + c.sk,
        'modelo.fit(X)   # separar!',
        'print(silhouette_score(X, modelo.labels_))',
      ];
    }
    return [
      'from sklearn import *',
      'X, y = ' + d.sk,
      escala,
      'modelo = ' + c.sk,
      'modelo.fit(X, y)   # treinar!',
      this.tarefa === 'regressao' ? 'print(r2_score(y, modelo.predict(X)))' : 'print(modelo.score(X, y))',
    ];
  }

  toggleMistakes(): void { this.showMistakes = !this.showMistakes; }
  toggleCode(): void { this.showCode = !this.showCode; }
}
