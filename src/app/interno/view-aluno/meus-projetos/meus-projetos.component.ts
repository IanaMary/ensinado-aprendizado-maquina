import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PipelineService, PipelineState } from '../../../service/pipeline.service';
import { MatSnackBar } from '@angular/material/snack-bar';

interface Projeto {
  id: string;
  nome: string;
  descricao: string;
  dataCriacao: string;
  dataModificacao: string;
  modelo?: string;
  dataset?: string;
  status: 'rascunho' | 'em_progresso' | 'concluido';
  thumbnail?: string;
}

@Component({
  selector: 'app-meus-projetos',
  templateUrl: './meus-projetos.component.html',
  styleUrls: ['./meus-projetos.component.scss'],
  standalone: false
})
export class MeusProjetosComponent implements OnInit {
  projetos: Projeto[] = [];
  carregando = true;
  filtroStatus: string = 'todos';
  termoBusca: string = '';

  constructor(
    private router: Router,
    private pipelineService: PipelineService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.carregarProjetos();
  }

  carregarProjetos(): void {
    this.carregando = true;
    this.pipelineService.listarPipelines().subscribe({
      next: (pipelines: PipelineState[]) => {
        this.projetos = pipelines.map(p => ({
          id: p.id || '',
          nome: p.nome,
          descricao: p.descricao || '',
          dataCriacao: p.dataCriacao || '',
          dataModificacao: p.dataModificacao || '',
          modelo: p.modeloSelecionado?.label || p.modeloSelecionado?.valor,
          dataset: p.resultadoColetaDado?.target,
          status: p.status || 'rascunho',
        }));
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      },
    });
  }

  get projetosFiltrados(): Projeto[] {
    let filtrados = this.projetos;
    
    if (this.filtroStatus !== 'todos') {
      filtrados = filtrados.filter(p => p.status === this.filtroStatus);
    }
    
    if (this.termoBusca) {
      const termo = this.termoBusca.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nome.toLowerCase().includes(termo) || 
        p.descricao.toLowerCase().includes(termo)
      );
    }
    
    return filtrados;
  }

  abrirProjeto(projeto: Projeto): void {
    this.router.navigate(['/interno/view-aluno'], { 
      queryParams: { pipeline: projeto.id } 
    });
  }

  criarNovoProjeto(): void {
    const novoPipeline: PipelineState = {
      nome: 'Novo Pipeline',
      descricao: 'Descreva seu pipeline aqui',
      status: 'rascunho'
    };

    this.pipelineService.salvarPipeline(novoPipeline).subscribe({
      next: (criado: PipelineState) => {
        this.snackBar.open('Novo projeto criado!', 'Fechar', { duration: 3000 });
        this.router.navigate(['/interno/view-aluno'], { 
          queryParams: { pipeline: criado.id } 
        });
      },
      error: () => {
        this.snackBar.open('Erro ao criar projeto', 'Fechar', { duration: 3000 });
      },
    });
  }

  excluirProjeto(projeto: Projeto, event: Event): void {
    event.stopPropagation();
    this.pipelineService.excluirPipeline(projeto.id).subscribe({
      next: () => {
        this.projetos = this.projetos.filter(p => p.id !== projeto.id);
        this.snackBar.open('Projeto excluído', 'Fechar', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erro ao excluir projeto', 'Fechar', { duration: 3000 });
      },
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'rascunho': 'Rascunho',
      'em_progresso': 'Em Progresso',
      'concluido': 'Concluído'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'rascunho': 'edit_note',
      'em_progresso': 'pending',
      'concluido': 'check_circle'
    };
    return icons[status] || 'help';
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getDataFormatada(data: string): string {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  voltar(): void {
    this.router.navigate(['/interno']);
  }
}

@Component({
  selector: 'app-meus-projetos',
  templateUrl: './meus-projetos.component.html',
  styleUrls: ['./meus-projetos.component.scss'],
  standalone: false
})
export class MeusProjetosComponent implements OnInit {
  projetos: Projeto[] = [];
  carregando = true;
  filtroStatus: string = 'todos';
  termoBusca: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.carregarProjetos();
  }

  carregarProjetos(): void {
    // TODO: Carregar do backend
    // Por enquanto, dados mockados para demonstração
    this.projetos = [
      {
        id: '1',
        nome: 'Classificação de Frutas',
        descricao: 'Pipeline para classificar frutas usando Decision Tree com dataset de frutas',
        dataCriacao: new Date('2024-01-15'),
        dataModificacao: new Date('2024-01-20'),
        modelo: 'Decision Tree',
        dataset: 'Fruits Dataset',
        status: 'concluido'
      },
      {
        id: '2',
        nome: 'Regressão de Preços',
        descricao: 'Análise de preços de imóveis usando Random Forest',
        dataCriacao: new Date('2024-02-10'),
        dataModificacao: new Date('2024-02-15'),
        modelo: 'Random Forest',
        dataset: 'Housing Prices',
        status: 'em_progresso'
      },
      {
        id: '3',
        nome: 'Detecção de Spam',
        descricao: 'Classificador de emails spam usando Naive Bayes',
        dataCriacao: new Date('2024-03-01'),
        dataModificacao: new Date('2024-03-01'),
        status: 'rascunho'
      }
    ];
    this.carregando = false;
  }

  get projetosFiltrados(): Projeto[] {
    let filtrados = this.projetos;
    
    if (this.filtroStatus !== 'todos') {
      filtrados = filtrados.filter(p => p.status === this.filtroStatus);
    }
    
    if (this.termoBusca) {
      const termo = this.termoBusca.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nome.toLowerCase().includes(termo) || 
        p.descricao.toLowerCase().includes(termo)
      );
    }
    
    return filtrados;
  }

  abrirProjeto(projeto: Projeto): void {
    // Navegar para o dashboard com o projeto selecionado
    this.router.navigate(['/interno/view-aluno'], { 
      queryParams: { projeto: projeto.id } 
    });
  }

  criarNovoProjeto(): void {
    // TODO: Criar novo projeto no backend
    const novoProjeto: Projeto = {
      id: Date.now().toString(),
      nome: 'Novo Pipeline',
      descricao: 'Descreva seu pipeline aqui',
      dataCriacao: new Date(),
      dataModificacao: new Date(),
      status: 'rascunho'
    };
    this.projetos.unshift(novoProjeto);
    this.abrirProjeto(novoProjeto);
  }

  excluirProjeto(projeto: Projeto, event: Event): void {
    event.stopPropagation();
    // TODO: Excluir no backend
    this.projetos = this.projetos.filter(p => p.id !== projeto.id);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'rascunho': 'Rascunho',
      'em_progresso': 'Em Progresso',
      'concluido': 'Concluído'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'rascunho': 'edit_note',
      'em_progresso': 'pending',
      'concluido': 'check_circle'
    };
    return icons[status] || 'help';
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getDataFormatada(data: Date): string {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  voltar(): void {
    this.router.navigate(['/interno']);
  }
}
