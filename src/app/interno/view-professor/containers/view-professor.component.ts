import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TurmaService, Turma } from '../../../service/turma.service';
import { AuthService } from '../../../service/auth/auth.service';

@Component({
  selector: 'app-view-professor',
  templateUrl: './view-professor.component.html',
  styleUrls: ['./view-professor.component.scss'],
  standalone: false
})
export class ViewProfessorComponent implements OnInit {

  turmas: Turma[] = [];
  carregando = true;
  criando = false;
  novoNome = '';
  novaDescricao = '';

  constructor(
    private router: Router,
    private turmaService: TurmaService,
    private snackBar: MatSnackBar,
    private authService: AuthService,
  ) { }

  /** Admin supervisiona todas as turmas; professor vê apenas as suas. */
  get usuarioAdmin(): boolean { return this.authService.getUsuarioRole() === 'admin'; }

  ngOnInit(): void {
    this.carregarTurmas();
  }

  carregarTurmas(): void {
    this.carregando = true;
    this.turmaService.listarTurmas().subscribe({
      next: (t) => { this.turmas = t || []; this.carregando = false; },
      error: () => { this.carregando = false; },
    });
  }

  criarTurma(): void {
    const nome = this.novoNome.trim();
    if (!nome) return;
    this.criando = true;
    this.turmaService.criarTurma({ nome, descricao: this.novaDescricao.trim() || undefined }).subscribe({
      next: (turma) => {
        this.turmas.unshift(turma);
        this.novoNome = ''; this.novaDescricao = ''; this.criando = false;
        this.snackBar.open('Turma criada.', 'Fechar', { duration: 3000 });
      },
      error: () => { this.criando = false; this.snackBar.open('Não foi possível criar a turma.', 'Fechar', { duration: 4000 }); },
    });
  }

  abrirTurma(t: Turma): void {
    this.router.navigate(['/view-professor/turmas', t.id]);
  }

  irAtividades(): void {
    this.router.navigate(['/atividades']);
  }
}
