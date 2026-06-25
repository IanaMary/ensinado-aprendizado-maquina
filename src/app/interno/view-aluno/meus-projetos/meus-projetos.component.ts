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
  filtroStatus = 'todos';
  termoBusca = '';

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
          dataset: p.resultadoColetaDado?.dataset_nome || p.resultadoColetaDado?.filename,
          status: (p.status as any) || 'rascunho',
        }));
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.snackBar.open('Erro ao carregar projetos', 'Fechar', { duration: 3000 });
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
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
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
