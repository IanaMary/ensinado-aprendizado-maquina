import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PipelineService, PipelineState } from '../../service/pipeline.service';
import { AuthService } from '../../service/auth/auth.service';

interface ModoEntrada {
  id: string;
  emoji: string;
  titulo: string;
  descricao: string;
  rota: string;
  cor: string;
  selo?: string;
}

/**
 * Seletor de entrada (logo após o login do aluno): escolhe entre as três
 * experiências — Treine seu Robô (fundamental/lúdico), Léo no Mundo Real
 * (câmera) e Trilha de ML. Mostra também o menu do usuário e os projetos salvos.
 */
@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss'],
})
export class InicioComponent implements OnInit {
  nome = (() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('usuario') || '{}');
      return u?.usuario?.nome || u?.nome || '';
    } catch {
      return '';
    }
  })();
  email = sessionStorage.getItem('email') || '';

  menuAberto = false;
  projetos: PipelineState[] = [];
  carregandoProjetos = true;

  modos: ModoEntrada[] = [
    {
      id: 'robo', emoji: '🤖', titulo: 'Treine seu Robô',
      descricao: 'Ensine um robô a reconhecer coisas, numa aventura passo a passo.',
      rota: '/treine-robo', cor: '#7C3AED', selo: 'Para começar',
    },
    {
      id: 'leo', emoji: '📸', titulo: 'Léo no Mundo Real',
      descricao: 'Tire fotos das suas coisas e ensine a IA a reconhecê-las de verdade.',
      rota: '/leo-mundo-real', cor: '#F59E0B', selo: 'Com a câmera',
    },
    {
      id: 'trilha', emoji: '🧭', titulo: 'Trilha de ML',
      descricao: 'Monte seu pipeline de machine learning em uma trilha visual.',
      rota: '/trilha', cor: '#3B82F6',
    },
  ];

  constructor(
    private router: Router,
    private pipelineService: PipelineService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.carregarProjetos();
  }

  get iniciais(): string {
    const base = (this.nome || this.email || 'U').trim();
    return base.slice(0, 2).toUpperCase();
  }

  carregarProjetos(): void {
    this.carregandoProjetos = true;
    this.pipelineService.listarPipelines().subscribe({
      next: (ps) => { this.projetos = ps || []; this.carregandoProjetos = false; },
      error: () => { this.projetos = []; this.carregandoProjetos = false; },
    });
  }

  abrir(m: ModoEntrada): void {
    this.router.navigate([m.rota]);
  }

  // Projetos salvos abrem na Trilha de ML (carrega via PipelineService).
  abrirProjeto(p: PipelineState): void {
    if (!p.id) return;
    this.router.navigate(['/trilha'], { queryParams: { pipeline: p.id } });
  }

  excluirProjeto(p: PipelineState, event: Event): void {
    event.stopPropagation();
    if (!p.id || !confirm(`Excluir o projeto "${p.nome}"?`)) return;
    this.pipelineService.excluirPipeline(p.id).subscribe({
      next: () => { this.projetos = this.projetos.filter((x) => x.id !== p.id); },
    });
  }

  formatarData(data?: string): string {
    if (!data) return '';
    try {
      return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuAberto = !this.menuAberto;
  }

  @HostListener('document:click')
  fecharMenu(): void {
    this.menuAberto = false;
  }

  sair(): void {
    this.auth.limparSessionStorage();
    this.router.navigate(['/autenticacao/login']);
  }
}
