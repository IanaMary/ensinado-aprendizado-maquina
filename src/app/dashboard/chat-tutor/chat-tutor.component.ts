import { Component, Input, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../services/dashboard.service';

interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

interface HistoricoItem {
  id: string;
  titulo: string;
  criado_em: string;
  atualizado_em: string;
}

@Component({
  selector: 'app-chat-tutor',
  templateUrl: './chat-tutor.component.html',
  styleUrls: ['./chat-tutor.component.scss'],
  standalone: false
})
export class ChatTutorComponent implements OnDestroy, OnChanges {
  @Input() contexto: any = null;
  @Input() pipelineId: string | null = null;

  mensagens: MensagemChat[] = [];
  entrada = '';
  carregando = false;
  erro = '';
  respostaStream = '';

  chatId: string | null = null;
  historico: HistoricoItem[] = [];
  mostrarHistorico = false;

  private streamSub: Subscription | null = null;

  sugestoes = [
    'Explique o modelo que estou usando.',
    'O que significam estas métricas?',
    'Como funciona o pré-processamento aplicado?',
    'Explique o código Python gerado.',
  ];

  constructor(private dashboardService: DashboardService) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['pipelineId'] && !changes['pipelineId'].firstChange) {
      this.limpar();
      this.chatId = null;
      this.carregarHistorico();
    }
  }

  ngOnDestroy() {
    this.streamSub?.unsubscribe();
  }

  // ---- Histórico ----

  carregarHistorico() {
    this.dashboardService.chatHistoricoListar(this.pipelineId || undefined).subscribe({
      next: (lista) => this.historico = lista,
    });
  }

  toggleHistorico() {
    this.mostrarHistorico = !this.mostrarHistorico;
    if (this.mostrarHistorico && !this.historico.length) {
      this.carregarHistorico();
    }
  }

  abrirConversa(item: HistoricoItem) {
    this.dashboardService.chatHistoricoObter(item.id).subscribe({
      next: (doc) => {
        this.chatId = doc.id;
        this.mensagens = doc.mensagens || [];
        this.mostrarHistorico = false;
      },
    });
  }

  novaConversa() {
    this.limpar();
    this.chatId = null;
    this.mostrarHistorico = false;
  }

  deletarConversa(event: Event, item: HistoricoItem) {
    event.stopPropagation();
    this.dashboardService.chatHistoricoDeletar(item.id).subscribe({
      next: () => {
        this.historico = this.historico.filter(h => h.id !== item.id);
        if (this.chatId === item.id) {
          this.limpar();
          this.chatId = null;
        }
      },
    });
  }

  // ---- Chat ----

  usarSugestao(texto: string) {
    this.entrada = texto;
    this.enviar();
  }

  enviar() {
    const texto = (this.entrada || '').trim();
    if (!texto || this.carregando) return;

    this.mensagens.push({ role: 'user', content: texto });
    this.entrada = '';
    this.erro = '';
    this.respostaStream = '';
    this.carregando = true;

    this.streamSub = this.dashboardService.chatTutorStream(this.mensagens, this.contexto).subscribe({
      next: (token) => {
        this.respostaStream += token;
      },
      error: (err) => {
        this.carregando = false;
        this.respostaStream = '';
        this.erro = err?.message || 'Não consegui falar com o tutor agora. Tente novamente.';
      },
      complete: () => {
        if (this.respostaStream) {
          this.mensagens.push({ role: 'assistant', content: this.respostaStream });
        }
        this.respostaStream = '';
        this.carregando = false;
        this.salvarHistorico();
      }
    });
  }

  cancelar() {
    this.streamSub?.unsubscribe();
    if (this.respostaStream) {
      this.mensagens.push({ role: 'assistant', content: this.respostaStream + ' *(interrompido)*' });
    }
    this.respostaStream = '';
    this.carregando = false;
    this.salvarHistorico();
  }

  private salvarHistorico() {
    if (!this.mensagens.length) return;

    if (this.chatId) {
      this.dashboardService.chatHistoricoAtualizar(this.chatId, this.mensagens).subscribe();
    } else {
      const titulo = this.mensagens[0]?.content?.substring(0, 60) || 'Nova conversa';
      this.dashboardService.chatHistoricoCriar(this.pipelineId || undefined, titulo).subscribe({
        next: (doc) => {
          this.chatId = doc.id;
          this.dashboardService.chatHistoricoAtualizar(doc.id, this.mensagens).subscribe();
        },
      });
    }
  }

  limpar() {
    this.streamSub?.unsubscribe();
    this.mensagens = [];
    this.respostaStream = '';
    this.erro = '';
  }
}
