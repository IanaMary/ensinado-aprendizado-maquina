import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TurmaService, Turma, Atividade } from '../../../service/turma.service';

@Component({
  selector: 'app-entrar-turma',
  templateUrl: './entrar-turma.component.html',
  styleUrls: ['./entrar-turma.component.scss'],
  standalone: false,
})
export class EntrarTurmaComponent implements OnInit {
  codigo = '';
  entrando = false;
  turmas: Turma[] = [];
  atividadesPorTurma: Record<string, Atividade[]> = {};
  carregando = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private turmaService: TurmaService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const codigo = this.route.snapshot.queryParamMap.get('codigo');
    if (codigo) {
      this.codigo = codigo.toUpperCase();
      this.entrar();
    } else {
      this.carregarMinhas();
    }
  }

  entrar(): void {
    const codigo = this.codigo.trim().toUpperCase();
    if (!codigo) return;
    this.entrando = true;
    this.turmaService.entrar(codigo).subscribe({
      next: (t) => {
        this.entrando = false; this.codigo = '';
        this.snackBar.open(`Você entrou na turma "${t.nome}".`, 'Fechar', { duration: 3000 });
        this.carregarMinhas();
      },
      error: (e) => {
        this.entrando = false;
        this.snackBar.open(e?.error?.detail || 'Código inválido.', 'Fechar', { duration: 4000 });
        this.carregarMinhas();
      },
    });
  }

  carregarMinhas(): void {
    this.carregando = true;
    this.turmaService.minhasTurmas().subscribe({
      next: (ts) => {
        this.turmas = ts || []; this.carregando = false;
        this.turmas.forEach(t => this.turmaService.listarAtividades(t.id).subscribe({
          next: (a) => this.atividadesPorTurma[t.id] = a || [],
        }));
      },
      error: () => { this.carregando = false; },
    });
  }

  fazerAtividade(t: Turma, a: Atividade): void {
    // Abre o dashboard clássico já vinculado à atividade; carrega o dataset do template.
    this.router.navigate(['/view-aluno'], {
      queryParams: { atividade: a.id, turma: t.id, dataset: a.template?.datasetNome || undefined },
    });
  }

  voltar(): void { this.router.navigate(['/view-aluno']); }
}
