import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

interface PipelineProfessor {
  id: string;
  nome: string;
  descricao: string;
  professor: string;
  disciplina?: string;
  turma?: string;
  publico: boolean;
  dataCriacao: Date;
  modelo: string;
  dataset: string;
  dificuldade: 'iniciante' | 'intermediario' | 'avancado';
  tags: string[];
  totalCopias: number;
  avaliacao: number;
}

@Component({
  selector: 'app-galeria-pipelines',
  templateUrl: './galeria-pipelines.component.html',
  styleUrls: ['./galeria-pipelines.component.scss'],
  standalone: false
})
export class GaleriaPipelinesComponent implements OnInit {
  pipelines: PipelineProfessor[] = [];
  carregando = true;
  filtroDificuldade: string = 'todos';
  filtroTipo: string = 'publicos';
  termoBusca: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.carregarPipelines();
  }

  carregarPipelines(): void {
    // TODO: Carregar do backend
    // Por enquanto, dados mockados para demonstração
    this.pipelines = [
      {
        id: '1',
        nome: 'Introdução ao KNN',
        descricao: 'Pipeline didático para aprender como o algoritmo K-Nearest Neighbors funciona com dados de frutas',
        professor: 'Prof. Maria Silva',
        disciplina: 'Machine Learning Básico',
        turma: 'Turma 2024.1',
        publico: true,
        dataCriacao: new Date('2024-01-10'),
        modelo: 'KNN',
        dataset: 'Fruits Dataset',
        dificuldade: 'iniciante',
        tags: ['classificação', 'knn', 'frutas'],
        totalCopias: 45,
        avaliacao: 4.8
      },
      {
        id: '2',
        nome: 'Árvore de Decisão na Prática',
        descricao: 'Explore como árvores de decisão tomam decisões usando dados de aprovação de empréstimos',
        professor: 'Prof. João Santos',
        disciplina: 'Ciência de Dados',
        publico: true,
        dataCriacao: new Date('2024-02-05'),
        modelo: 'Decision Tree',
        dataset: 'Loan Approval',
        dificuldade: 'iniciante',
        tags: ['classificação', 'árvore', 'interpretabilidade'],
        totalCopias: 32,
        avaliacao: 4.6
      },
      {
        id: '3',
        nome: 'SVM para Classificação de Texto',
        descricao: 'Use Support Vector Machines para classificar sentimentos em reviews de filmes',
        professor: 'Prof. Ana Costa',
        disciplina: 'NLP',
        publico: true,
        dataCriacao: new Date('2024-03-15'),
        modelo: 'SVM',
        dataset: 'Movie Reviews',
        dificuldade: 'intermediario',
        tags: ['nlp', 'svm', 'sentimentos'],
        totalCopias: 18,
        avaliacao: 4.4
      },
      {
        id: '4',
        nome: 'Random Forest Avançado',
        descricao: 'Pipeline completo com feature engineering e otimização de hiperparâmetros para Random Forest',
        professor: 'Prof. Maria Silva',
        disciplina: 'Machine Learning Avançado',
        turma: 'Turma 2024.2',
        publico: false,
        dataCriacao: new Date('2024-04-01'),
        modelo: 'Random Forest',
        dataset: 'Titanic',
        dificuldade: 'avancado',
        tags: ['ensemble', 'feature engineering', 'otimização'],
        totalCopias: 8,
        avaliacao: 4.9
      }
    ];
    this.carregando = false;
  }

  get pipelinesFiltrados(): PipelineProfessor[] {
    let filtrados = this.pipelines;
    
    // Filtrar por tipo (públicos/privados)
    if (this.filtroTipo === 'publicos') {
      filtrados = filtrados.filter(p => p.publico);
    } else if (this.filtroTipo === 'turma') {
      filtrados = filtrados.filter(p => !p.publico && p.turma);
    }
    
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
    // Navegar para o playground com o pipeline selecionado
    this.router.navigate(['/interno/view-aluno/playground'], { 
      queryParams: { pipeline: pipeline.id } 
    });
  }

  copiarPipeline(pipeline: PipelineProfessor, event: Event): void {
    event.stopPropagation();
    // TODO: Copiar pipeline para o usuário atual no backend
    console.log('Copiando pipeline:', pipeline.nome);
    // Mostrar feedback visual
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

  getDataFormatada(data: Date): string {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getEstrelas(avaliacao: number): number[] {
    return Array(5).fill(0).map((_, i) => i < Math.floor(avaliacao) ? 1 : 0);
  }

  voltar(): void {
    this.router.navigate(['/interno/view-aluno']);
  }
}
