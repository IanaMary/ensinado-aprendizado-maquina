import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../service/auth/auth.service';
import { DashboardService } from '../../../dashboard/services/dashboard.service';
import { NotificacaoService } from '../../../service/notificacao.service';

type Lane = 'coleta_dados' | 'modelos' | 'metricas';

interface ItemAdmin {
  id: string;
  label?: string;
  valor?: string;
  habilitado: boolean;
  preverCategoria?: boolean;
  dadosRotulados?: boolean;
  salvando?: boolean;
  [k: string]: any;
}

@Component({
  selector: 'app-conf-pipeline',
  templateUrl: './conf-pipeline.component.html',
  styleUrls: ['./conf-pipeline.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ]
})
export class ConfPipelineComponent implements OnInit {

  role: string = sessionStorage.getItem('role') || '';

  itensColeta: ItemAdmin[] = [];
  itensModelos: ItemAdmin[] = [];
  itensMetricas: ItemAdmin[] = [];

  carregandoColeta = true;
  carregandoModelos = true;
  carregandoMetricas = true;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly dashboard: DashboardService,
    private readonly notificacao: NotificacaoService,
  ) { }

  ngOnInit() {
    this.carregarColeta();
    this.carregarModelos();
    this.carregarMetricas();
  }

  private carregarColeta() {
    this.carregandoColeta = true;
    this.dashboard.fetchItensColetasDados().subscribe({
      next: (itens: any[]) => {
        this.itensColeta = (itens || []).map(i => ({ ...i, habilitado: i.habilitado !== false }));
        this.carregandoColeta = false;
      },
      error: () => {
        this.notificacao.erro('Erro ao carregar itens de coleta.');
        this.carregandoColeta = false;
      }
    });
  }

  private carregarModelos() {
    this.carregandoModelos = true;
    this.dashboard.fetchItensModelos().subscribe({
      next: (itens: any[]) => {
        this.itensModelos = (itens || []).map(i => ({ ...i, habilitado: i.habilitado !== false }));
        this.carregandoModelos = false;
      },
      error: () => {
        this.notificacao.erro('Erro ao carregar modelos.');
        this.carregandoModelos = false;
      }
    });
  }

  private carregarMetricas() {
    this.carregandoMetricas = true;
    this.dashboard.fetchItensMetricas().subscribe({
      next: (itens: any[]) => {
        this.itensMetricas = (itens || []).map(i => ({ ...i, habilitado: i.habilitado !== false }));
        this.carregandoMetricas = false;
      },
      error: () => {
        this.notificacao.erro('Erro ao carregar métricas.');
        this.carregandoMetricas = false;
      }
    });
  }

  toggle(tipo: Lane, item: ItemAdmin) {
    const novoValor = !item.habilitado;
    item.salvando = true;
    this.dashboard.patchHabilitado(tipo, item.id, novoValor).subscribe({
      next: () => {
        item.habilitado = novoValor;
        item.salvando = false;
        this.notificacao.sucesso(`${item.label || item.valor}: ${novoValor ? 'habilitado' : 'desabilitado'}.`);
      },
      error: () => {
        item.salvando = false;
        this.notificacao.erro('Não foi possível atualizar este item.');
      }
    });
  }

  tipoModelo(item: ItemAdmin): string {
    if (item.preverCategoria === true) return 'Classificação';
    if (item.preverCategoria === false && item.dadosRotulados !== false) return 'Regressão';
    if (item.dadosRotulados === false) return 'Agrupamento';
    return '';
  }

  navegar(bool: boolean) {
    if (bool) {
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      this.auth.limparSessionStorage();
      this.router.navigate(['/autenticacao/login']);
    }
  }

}
