import { Component, Input, OnInit } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { ResultadoColetaDado } from '../../../../models/item-coleta-dado.model';
import { SessionService } from '../../../../service/sessao-store.service';
import { NotificacaoService } from '../../../../service/notificacao.service';

@Component({
  selector: 'app-visualizacao-dados',
  templateUrl: './visualizacao-dados.component.html',
  styleUrls: ['./visualizacao-dados.component.scss'],
  standalone: false
})
export class VisualizacaoDadosComponent implements OnInit {
  @Input() resultadoColetaDado: ResultadoColetaDado | undefined;

  colunasDisponiveis: string[] = [];
  colunasSelecionadas: string[] = [];
  hueSelecionado = '';

  imagemBase64 = '';
  colunasVisualizadas: string[] = [];
  hueAtual = '';
  totalAmostras = 0;

  carregando = false;
  erro = '';

  constructor(
    private dashboardService: DashboardService,
    private sessionService: SessionService,
    private notificacao: NotificacaoService
  ) {}

  ngOnInit(): void {
    if (this.resultadoColetaDado) {
      this.colunasDisponiveis = this.resultadoColetaDado.colunas || [];
      // Selecionar todas as colunas por padrão (máximo 8)
      this.colunasSelecionadas = this.colunasDisponiveis.slice(0, 8);
      // Usar target como hue padrão se disponível
      if (this.resultadoColetaDado.target) {
        this.hueSelecionado = this.resultadoColetaDado.target;
      }
    }
  }

  toggleColuna(coluna: string): void {
    const idx = this.colunasSelecionadas.indexOf(coluna);
    if (idx >= 0) {
      this.colunasSelecionadas.splice(idx, 1);
    } else {
      if (this.colunasSelecionadas.length < 10) {
        this.colunasSelecionadas.push(coluna);
      } else {
        this.notificacao.aviso('Máximo de 10 colunas permitidas.');
      }
    }
  }

  gerarPairplot(): void {
    if (this.colunasSelecionadas.length < 2) {
      this.erro = 'Selecione pelo menos 2 colunas.';
      return;
    }

    const arquivoId = this.sessionService.getColetaId();
    const configuracaoId = this.sessionService.getConfigurcaoTreinamento();

    if (!arquivoId || !configuracaoId) {
      this.erro = 'IDs de arquivo ou configuração não encontrados.';
      return;
    }

    this.carregando = true;
    this.erro = '';

    const body = {
      arquivo_id: arquivoId,
      configuracao_id: configuracaoId,
      colunas: this.colunasSelecionadas,
      hue: this.hueSelecionado || null
    };

    this.dashboardService.gerarPairplot(body).subscribe({
      next: (res: any) => {
        this.imagemBase64 = res.imagem;
        this.colunasVisualizadas = res.colunas;
        this.hueAtual = res.hue || '';
        this.totalAmostras = res.total_amostras;
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao gerar pairplot:', err);
        this.erro = err?.error?.detail || 'Erro ao gerar visualização.';
        this.carregando = false;
      }
    });
  }
}
