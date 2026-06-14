import { Component, Input } from '@angular/core';
import { DashboardService } from '../services/dashboard.service';

interface MensagemChat {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chat-tutor',
  templateUrl: './chat-tutor.component.html',
  styleUrls: ['./chat-tutor.component.scss'],
  standalone: false
})
export class ChatTutorComponent {
  // Contexto do pipeline (dataset, modelo, hiperparametros, metricas, graficos, codigo).
  @Input() contexto: any = null;

  mensagens: MensagemChat[] = [];
  entrada = '';
  carregando = false;
  erro = '';

  sugestoes = [
    'Explique o modelo que estou usando.',
    'O que significam estas métricas?',
    'Como funciona o pré-processamento aplicado?',
    'Explique o código Python gerado.',
  ];

  constructor(private dashboardService: DashboardService) { }

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
    this.carregando = true;

    this.dashboardService.chatTutor(this.mensagens, this.contexto).subscribe({
      next: (res) => {
        this.mensagens.push({ role: 'assistant', content: res?.resposta || '...' });
        this.carregando = false;
      },
      error: (err) => {
        this.carregando = false;
        this.erro = err?.error?.detail || 'Não consegui falar com o tutor agora. Tente novamente.';
      }
    });
  }

  limpar() {
    this.mensagens = [];
    this.erro = '';
  }
}
