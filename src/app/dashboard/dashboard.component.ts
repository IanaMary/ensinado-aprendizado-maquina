import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService } from './services/dashboard.service';
import { ExecucoesComponent } from './execucoes/execucoes.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit {

  @ViewChild(ExecucoesComponent) execucoesComponent!: ExecucoesComponent;

  constructor(private dashboardService: DashboardService, private router: Router) { }

  irParaTrilha() {
    this.router.navigate(['/trilha']);
  }

  // Volta ao painel de entrada do aluno.
  voltar() {
    this.router.navigate(['/inicio']);
  }

  ngOnInit() {
    this.dashboardService.carregarDados();
  }

  salvarPipeline() {
    this.execucoesComponent?.salvarPipeline();
  }

  limparSessao() {
    this.execucoesComponent?.limparSessao();
  }

  baixarPipeline() {
    this.execucoesComponent?.baixarPipeline();
  }

}
