import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DashboardService } from '../../dashboard/services/dashboard.service';

type Fase = 'build' | 'training' | 'done';
type Sentido = 'sharp' | 'skip';

interface DatasetLudico { id: string; toy: string; emoji: string; nome: string; dica: string; cor: string; sk: string; }
interface CerebroLudico { id: string; valor: string; emoji: string; nome: string; dica: string; cor: string; sk: string; }

/**
 * "Treine seu Robô" — porta de entrada lúdica (ensino fundamental). Um assistente
 * guiado (Missão → Sentidos → Cérebro → Treinar) com mascote robô. O TREINO É REAL:
 * reusa o backend (carregarToyDataset → classificadorTreino → postMetricas). Fase A:
 * só missões de classificação (acurácia + matriz de confusão de verdade).
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

  DATASETS: DatasetLudico[] = [
    { id: 'flores', toy: 'iris', emoji: '🌸', nome: 'Flores', dica: 'reconhecer 3 tipos de flor', cor: '#EC4899', sk: 'load_iris()' },
    { id: 'bebidas', toy: 'wine', emoji: '🍷', nome: 'Bebidas', dica: 'descobrir o tipo da bebida', cor: '#A855F7', sk: 'load_wine()' },
    { id: 'exames', toy: 'breast_cancer', emoji: '🩺', nome: 'Exames', dica: 'separar exames em dois grupos', cor: '#38BDF8', sk: 'load_breast_cancer()' },
  ];
  CEREBROS: CerebroLudico[] = [
    { id: 'floresta', valor: 'random_forest', emoji: '🌳', nome: 'Floresta Mágica', dica: 'muitas arvorezinhas votam juntas', cor: '#22C55E', sk: 'RandomForestClassifier()' },
    { id: 'arvore', valor: 'arvore_decisao', emoji: '🌲', nome: 'Árvore de Perguntas', dica: 'faz perguntas sim/não até decidir', cor: '#14B8A6', sk: 'DecisionTreeClassifier()' },
    { id: 'vizinhos', valor: 'knn', emoji: '👯', nome: 'Os Vizinhos', dica: 'olha quem é mais parecido', cor: '#F59E0B', sk: 'KNeighborsClassifier()' },
  ];

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
  coleta: any = null;          // resposta de carregarToyDataset
  modelosCat: any[] = [];      // catálogo de modelos (valor → id)
  score = 0;                   // acurácia (0..1)
  matriz: { matriz: number[][]; classes: string[]; total: number } | null = null;

  constructor(private dashboard: DashboardService, private router: Router) {}

  ngOnInit(): void {
    this.dashboard.fetchItensModelos().subscribe({
      next: (m: any[]) => (this.modelosCat = m || []),
      error: () => (this.modelosCat = []),
    });
  }

  voltarInicio(): void { this.router.navigate(['/inicio']); }

  get dataset(): DatasetLudico | null { return this.DATASETS.find(d => d.id === this.datasetId) || null; }
  get cerebro(): CerebroLudico | null { return this.CEREBROS.find(c => c.id === this.brainId) || null; }

  get step(): 'mission' | 'senses' | 'brain' | 'ready' {
    if (!this.datasetId) return 'mission';
    if (this.senses === null) return 'senses';
    if (!this.brainId) return 'brain';
    return 'ready';
  }

  // ---------- escolhas ----------
  escolherDataset(d: DatasetLudico): void {
    if (this.carregandoDados) return;
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
    this.fase = 'training'; this.showMistakes = false; this.showCode = false; this.erro = '';
    const body = {
      tipo_arquivo: 'xlsx',
      arquivo_id: this.coleta.id_coleta,
      configuracao_id: this.coleta.id_configuracoes_treinamento,
      modelo_id: modeloItem.id,
      hiperparametros: {},
      pre_processamento: this.senses === 'sharp' ? [{ valor: 'minmax_scaler' }] : [],
    };
    this.dashboard.classificadorTreino(this.cerebro.valor, body).subscribe({
      next: (treino: any) => this.avaliar(treino),
      error: (e) => this.falhaTreino(e),
    });
  }

  private avaliar(treino: any): void {
    const body = {
      modelos: [{ id: treino.id, label: treino.nome_modelo }],
      metricas: [
        { valor: 'accuracy_score', label: 'acuracia', average: 'weighted' },
        { valor: 'confusion_matrix', label: 'matriz' },
      ],
    };
    this.dashboard.postMetricas(body).subscribe({
      next: (aval: any) => {
        const acc = aval?.['acuracia']?.[treino.nome_modelo];
        this.score = typeof acc === 'number' ? acc : 0;
        const mz = aval?.['matriz']?.[treino.nome_modelo];
        this.matriz = mz && Array.isArray(mz.matriz) ? mz : null;
        this.fase = 'done';
      },
      error: (e) => this.falhaTreino(e),
    });
  }

  private falhaTreino(e: any): void {
    this.fase = 'build';
    this.erro = e?.error?.detail || 'O robô ficou confuso no treino. Tenta de novo! 🙈';
  }

  recomecar(): void {
    this.datasetId = null; this.senses = null; this.brainId = null; this.fase = 'build';
    this.score = 0; this.matriz = null; this.showMistakes = false; this.showCode = false; this.erro = ''; this.coleta = null;
  }

  // ---------- humor / mascote ----------
  get mood(): 'idle' | 'happy' | 'thinking' | 'celebrate' {
    if (this.fase === 'training') return 'thinking';
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
  get scoreMsg(): string {
    const p = this.pct, n = this.robotName;
    return p >= 92 ? `Uau! O ${n} ficou craque! 🏆` : p >= 82 ? `Muito bem! O ${n} aprendeu bastante! 🎉` : `Boa! Dá pra treinar mais e melhorar! 💪`;
  }

  // ---------- falas ----------
  get sayText(): string {
    const n = this.robotName;
    if (this.fase === 'training') return 'Deixa comigo, tô aprendendo! 🧠';
    if (this.fase === 'done') return this.scoreMsg;
    if (this.erro) return this.erro;
    switch (this.step) {
      case 'mission': return `Oi! Eu sou o robô ${n} 🤖 O que você quer me ensinar?`;
      case 'senses': return 'Boa escolha! Quer afinar meus sentidos antes?';
      case 'brain': return 'Agora escolhe meu cérebro! Como eu devo pensar?';
      default: return 'Tô prontíssimo pra aprender! 🎉';
    }
  }
  get hintText(): string {
    if (this.erro) return '';
    switch (this.step) {
      case 'mission': return 'Toque numa missão pra começar a aventura!';
      case 'senses': return 'Isso deixa tudo na mesma medida pra eu enxergar melhor (os robôs gostam disso!).';
      case 'brain': return 'Cada cérebro aprende de um jeito diferente. Pode experimentar!';
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

  // ---------- "o que ele respondeu" (matriz de confusão real) ----------
  get linhasMatriz() {
    if (!this.matriz) return [];
    const { matriz, classes } = this.matriz;
    return classes.map((c, i) => {
      const linha = matriz[i] || [];
      const total = linha.reduce((a, b) => a + b, 0);
      const certo = linha[i] || 0;
      const confusoes = classes
        .map((cj, j) => ({ classe: cj, n: linha[j] || 0 }))
        .filter((x, j) => j !== i && x.n > 0);
      return { classe: c, total, certo, errado: total - certo, confusoes };
    });
  }

  // ---------- código (blocos + python simplificado) ----------
  get scratchBlocks() {
    const d = this.dataset, c = this.cerebro;
    if (this.fase !== 'done' || !d || !c) return [];
    const b: any[] = [{ emoji: d.emoji, text: 'usar dados de ' + d.nome, cor: '#4C97FF' }];
    if (this.senses === 'sharp') b.push({ emoji: '📏', text: 'deixar na mesma medida', cor: '#9966FF' });
    b.push({ emoji: c.emoji, text: 'treinar ' + c.nome, cor: '#59C059' });
    b.push({ emoji: '🎯', text: 'mostrar o acerto', cor: '#FF8C1A' });
    return b;
  }
  get codeLines(): string[] {
    const d = this.dataset, c = this.cerebro;
    if (this.fase !== 'done' || !d || !c) return [];
    return [
      'from sklearn import *',
      'X, y = ' + d.sk,
      this.senses === 'sharp' ? 'X = MinMaxScaler().fit_transform(X)' : '# (sem ajustar a escala)',
      'modelo = ' + c.sk,
      'modelo.fit(X, y)   # treinar!',
      'print(modelo.score(X, y))',
    ];
  }

  toggleMistakes(): void { this.showMistakes = !this.showMistakes; }
  toggleCode(): void { this.showCode = !this.showCode; }
}
