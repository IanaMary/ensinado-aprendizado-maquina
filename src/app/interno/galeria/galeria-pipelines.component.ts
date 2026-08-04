import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PipelineService, PipelineProfessor, PipelineState } from '../../service/pipeline.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-galeria-pipelines',
  templateUrl: './galeria-pipelines.component.html',
  styleUrls: ['./galeria-pipelines.component.scss'],
  standalone: false
})
export class GaleriaPipelinesComponent implements OnInit {
  pipelines: PipelineProfessor[] = [];
  carregando = true;
  filtroDificuldade = 'todos';
  termoBusca = '';

  constructor(
    private router: Router,
    private pipelineService: PipelineService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarPipelines();
  }

  carregarPipelines(): void {
    this.carregando = true;
    this.pipelineService.listarPipelinesProfessores().subscribe({
      next: (data: any[]) => {
        this.pipelines = data.map(p => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao || '',
          professor: p.professor_id || 'Professor',
          publico: p.is_public,
          dataCriacao: p.dataCriacao,
          modelo: p.modeloSelecionado?.label || 'Não definido',
          dataset: p.resultadoColetaDado?.dataset_nome || 'Não definido',
          dificuldade: p.dificuldade || 'iniciante',
          tags: p.tags || [],
        }));
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.snackBar.open('Erro ao carregar galeria', 'Fechar', { duration: 3000 });
      }
    });
  }

  get pipelinesFiltrados(): PipelineProfessor[] {
    let filtrados = this.pipelines;
    
    // Não há filtro por visibilidade aqui: `GET /pipelines/galeria` já devolve SÓ `is_public: true`
    // (`app/routers/pipelines.py:listar_galeria`). O filtro "Minha Turma" que existia filtrava
    // `!publico` sobre essa lista, então devolvia SEMPRE lista vazia — o aluno clicava e a galeria
    // sumia. Filtrar por turma de verdade exige o endpoint devolver o vínculo, que é feature, não
    // conserto; até então a tela não promete o que não faz.


    // Filtrar por dificuldade
    if (this.filtroDificuldade !== 'todos') {
      filtrados = filtrados.filter(p => p.dificuldade === this.filtroDificuldade);
    }
    
    // Filtrar por busca
    if (this.termoBusca) {
      const termo = this.termoBusca.toLowerCase();
      filtrados = filtrados.filter(p => 
        p.nome.toLowerCase().includes(termo) || 
        p.descricao.toLowerCase().includes(termo) ||
        p.professor.toLowerCase().includes(termo) ||
        p.tags.some(t => t.toLowerCase().includes(termo))
      );
    }
    
    return filtrados;
  }

  abrirPipeline(pipeline: PipelineProfessor): void {
    // Navegar para o playground com o pipeline selecionado (modo visualização)
    this.router.navigate(['/inicio'], { 
      queryParams: { pipeline: pipeline.id, viewOnly: true } 
    });
  }

  copiarPipeline(pipeline: PipelineProfessor, event: Event): void {
    event.stopPropagation();
    this.pipelineService.copiarPipeline(pipeline.id).subscribe({
      next: (copia: PipelineState) => {
        this.snackBar.open('Projeto copiado para sua lista!', 'Abrir', { duration: 5000 })
          .onAction().subscribe(() => {
            this.router.navigate(['/inicio'], { 
              queryParams: { pipeline: copia.id } 
            });
          });
      },
      error: () => {
        this.snackBar.open('Erro ao copiar pipeline', 'Fechar', { duration: 3000 });
      }
    });
  }

  getDificuldadeLabel(dificuldade: string): string {
    const labels: Record<string, string> = {
      'iniciante': 'Iniciante',
      'intermediario': 'Intermediário',
      'avancado': 'Avançado'
    };
    return labels[dificuldade] || dificuldade;
  }

  getDificuldadeClass(dificuldade: string): string {
    return `dificuldade-${dificuldade}`;
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
    this.router.navigate(['/inicio']);
  }
}
