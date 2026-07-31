import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardService } from './services/dashboard.service';
import { ExecucoesComponent } from './execucoes/execucoes.component';
import { AuthService } from '../service/auth/auth.service';
import { roleMap } from '../models/item-coleta-dado.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit {

  // Só existe depois que a view do filho é criada; `!` afirmaria o contrário e é o que fazia o
  // `?.` do template parecer redundante (NG8107).
  @ViewChild(ExecucoesComponent) execucoesComponent?: ExecucoesComponent;

  constructor(private dashboardService: DashboardService, private router: Router, private auth: AuthService) { }

  ngOnInit() {
    this.dashboardService.carregarDados();
  }

  // Volta à home do papel (admin -> /view-admin, professor -> /view-professor, aluno -> /view-aluno).
  voltar() {
    const role = this.auth.getUsuarioRole();
    this.router.navigateByUrl((role && roleMap[role]) || '/autenticacao/login');
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
