import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  LaneDesafio, PecaDesafio, ResultadoMontagem, TabuleiroDesafio, TurmaService,
} from '../../service/turma.service';
import { roleMap } from '../../models/item-coleta-dado.model';
import { AuthService } from '../../service/auth/auth.service';

interface LaneInfo {
  id: LaneDesafio;
  titulo: string;
  icone: string;
  dica: string;
}

/** Ordem e rótulos das lanes — os mesmos do dashboard, para o aluno reconhecer o tabuleiro. */
const LANES: LaneInfo[] = [
  { id: 'coleta', titulo: 'Coleta', icone: 'upload_file', dica: 'De onde vêm os dados' },
  { id: 'pre_processamento', titulo: 'Pré-processamento', icone: 'transform', dica: 'Preparar os dados (a ordem importa)' },
  { id: 'modelo', titulo: 'Modelo', icone: 'model_training', dica: 'Quem aprende com os dados' },
  { id: 'metrica', titulo: 'Métrica', icone: 'analytics', dica: 'Como saber se foi bem' },
];

/**
 * Desafio de montagem: o aluno recebe um problema e peças embaralhadas (algumas que NÃO
 * servem) e monta o pipeline arrastando, sem executar nada. A nota e as explicações vêm do
 * backend — aqui não existe gabarito nem correção: **a peça fica na coluna em que o aluno a
 * colocou**, mesmo que seja a errada, porque saber a que etapa cada bloco pertence é parte
 * do que o desafio mede. O tabuleiro nem recebe a etapa das peças (o backend não a envia).
 *
 * Cada tentativa recebe um tabuleiro novo (o backend re-sorteia), então não dá para
 * consertar item por item até fechar 10 sem entender o motivo.
 */
@Component({
  selector: 'app-desafio',
  standalone: true,
  imports: [
    CommonModule, DragDropModule, MatIconModule,
    MatSnackBarModule, MatProgressSpinnerModule,
  ],
  templateUrl: './desafio.component.html',
  styleUrls: ['./desafio.component.scss'],
})
export class DesafioComponent implements OnInit {
  readonly lanes = LANES;

  turmaId = '';
  atividadeId = '';
  carregando = true;
  enviando = false;
  erro = '';

  tabuleiro?: TabuleiroDesafio;
  /** Peças ainda na bandeja (não usadas). */
  disponiveis: PecaDesafio[] = [];
  /** Peça tocada na bandeja, esperando o aluno escolher a coluna. */
  pecaSelecionada?: PecaDesafio;
  /** Peças colocadas em cada lane, na ordem escolhida pelo aluno. */
  montagem: Record<LaneDesafio, PecaDesafio[]> = {
    coleta: [], pre_processamento: [], modelo: [], metrica: [],
  };
  resultado?: ResultadoMontagem;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private turmaService: TurmaService,
    private auth: AuthService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const p = this.route.snapshot.queryParams;
    this.turmaId = p['turma'] || '';
    this.atividadeId = p['atividade'] || '';
    if (!this.turmaId || !this.atividadeId) {
      this.erro = 'Desafio não informado. Abra o desafio pela lista de atividades da turma.';
      this.carregando = false;
      return;
    }
    this.carregarTabuleiro();
  }

  // ------------------------------------------------------------------ dados
  private carregarTabuleiro(): void {
    this.carregando = true;
    this.erro = '';
    this.resultado = undefined;
    this.turmaService.obterTabuleiro(this.turmaId, this.atividadeId).subscribe({
      next: (t) => {
        this.tabuleiro = t;
        this.disponiveis = [...t.pecas];
        this.pecaSelecionada = undefined;
        this.montagem = { coleta: [], pre_processamento: [], modelo: [], metrica: [] };
        this.carregando = false;
      },
      error: (e) => {
        this.erro = e?.status === 404
          ? 'Desafio não encontrado (ou você não está nesta turma).'
          : 'Não foi possível carregar o desafio. Tente novamente.';
        this.carregando = false;
      },
    });
  }

  get idsLanes(): string[] {
    return ['bandeja', ...this.lanes.map((l) => `lane-${l.id}`)];
  }

  // ------------------------------------------------------------------ drag & drop
  soltar(evento: CdkDragDrop<PecaDesafio[]>): void {
    if (evento.previousContainer === evento.container) {
      moveItemInArray(evento.container.data, evento.previousIndex, evento.currentIndex);
      return;
    }
    transferArrayItem(evento.previousContainer.data, evento.container.data,
                      evento.previousIndex, evento.currentIndex);
  }

  /**
   * Alternativa ao arrastar, para quem está no celular: um toque escolhe a peça, o toque
   * seguinte diz em que coluna ela entra. São dois passos de propósito — o clique único
   * mandava a peça para a coluna certa sozinho, ou seja, respondia a pergunta do desafio.
   */
  selecionar(peca: PecaDesafio): void {
    this.pecaSelecionada = this.pecaSelecionada?.valor === peca.valor ? undefined : peca;
  }

  /** Coloca a peça escolhida na coluna que o ALUNO indicou — certa ou errada. */
  colocarNaLane(lane: LaneDesafio): void {
    const peca = this.pecaSelecionada;
    if (!peca) { return; }
    this.pecaSelecionada = undefined;
    this.disponiveis = this.disponiveis.filter((p) => p.valor !== peca.valor);
    this.montagem[lane].push(peca);
  }

  devolverPeca(lane: LaneDesafio, indice: number): void {
    const [peca] = this.montagem[lane].splice(indice, 1);
    if (peca) { this.disponiveis.push(peca); }
  }

  pecasDaLane(lane: LaneDesafio): PecaDesafio[] {
    return this.montagem[lane];
  }

  get lanesVazias(): LaneInfo[] {
    return this.lanes.filter((l) => !this.montagem[l.id].length);
  }

  get podeSubmeter(): boolean {
    return !this.enviando && this.lanes.some((l) => this.montagem[l.id].length > 0);
  }

  // ------------------------------------------------------------------ submissão
  submeter(): void {
    if (!this.podeSubmeter) { return; }
    this.enviando = true;
    const corpo: Record<string, string[]> = {};
    for (const lane of this.lanes) {
      corpo[lane.id] = this.montagem[lane.id].map((p) => p.valor);
    }
    this.turmaService.submeterMontagem(this.turmaId, this.atividadeId, corpo).subscribe({
      next: (r) => {
        this.resultado = r;
        this.enviando = false;
      },
      error: () => {
        this.enviando = false;
        this.snack.open('Não foi possível enviar a montagem. Tente novamente.', 'Fechar',
                        { duration: 4000 });
      },
    });
  }

  /** Nova tentativa: o backend devolve OUTRO tabuleiro (peças diferentes). */
  tentarNovamente(): void {
    this.carregarTabuleiro();
  }

  get regrasErradas() {
    return (this.resultado?.regras || []).filter((r) => !r.ok);
  }

  get regrasCertas() {
    return (this.resultado?.regras || []).filter((r) => r.ok);
  }

  voltar(): void {
    const papel = this.auth.getUsuarioRole() || 'aluno';
    this.router.navigate([roleMap[papel] || '/view-aluno']);
  }
}
