import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';

export interface PipelineState {
  id?: string;
  nome: string;
  descricao?: string;
  resultadoColetaDado?: any;
  modeloSelecionado?: any;
  metricasSelecionadas?: any[];
  preProcessamentoConfig?: any;
  resultadoTreinamento?: any;
  resultadosDasAvaliacoes?: any;
  dataCriacao?: Date;
  dataModificacao?: Date;
  status?: 'rascunho' | 'em_progresso' | 'concluido';
}

export interface PipelineProfessor {
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
  estado?: PipelineState;
}

@Injectable({
  providedIn: 'root'
})
export class PipelineService {
  private pipelineAtual = new BehaviorSubject<PipelineState | null>(null);
  pipelineAtual$ = this.pipelineAtual.asObservable();

  constructor(private http: HttpClient) {}

  // Salvar pipeline do aluno
  salvarPipeline(state: PipelineState): Observable<PipelineState> {
    // TODO: Implementar chamada ao backend
    // Por enquanto, salvar no localStorage
    const pipelines = this.getPipelinesLocalStorage();
    
    if (state.id) {
      // Atualizar existente
      const index = pipelines.findIndex(p => p.id === state.id);
      if (index >= 0) {
        pipelines[index] = { ...state, dataModificacao: new Date() };
      }
    } else {
      // Criar novo
      state.id = Date.now().toString();
      state.dataCriacao = new Date();
      state.dataModificacao = new Date();
      state.status = 'rascunho';
      pipelines.push(state);
    }
    
    this.salvarPipelinesLocalStorage(pipelines);
    this.pipelineAtual.next(state);
    
    return of(state);
  }

  // Carregar pipeline do aluno
  carregarPipeline(id: string): Observable<PipelineState | null> {
    // TODO: Implementar chamada ao backend
    const pipelines = this.getPipelinesLocalStorage();
    const pipeline = pipelines.find(p => p.id === id) || null;
    this.pipelineAtual.next(pipeline);
    return of(pipeline);
  }

  // Listar pipelines do aluno
  listarPipelines(): Observable<PipelineState[]> {
    // TODO: Implementar chamada ao backend
    const pipelines = this.getPipelinesLocalStorage();
    return of(pipelines);
  }

  // Excluir pipeline do aluno
  excluirPipeline(id: string): Observable<boolean> {
    // TODO: Implementar chamada ao backend
    const pipelines = this.getPipelinesLocalStorage();
    const filtered = pipelines.filter(p => p.id !== id);
    this.salvarPipelinesLocalStorage(filtered);
    return of(true);
  }

  // Copiar pipeline de professor para aluno
  copiarPipeline(pipelineProfessor: PipelineProfessor): Observable<PipelineState> {
    const novoPipeline: PipelineState = {
      nome: `${pipelineProfessor.nome} (Cópia)`,
      descricao: `Cópia do pipeline de ${pipelineProfessor.professor}: ${pipelineProfessor.descricao}`,
      resultadoColetaDado: pipelineProfessor.estado?.resultadoColetaDado,
      modeloSelecionado: pipelineProfessor.estado?.modeloSelecionado,
      metricasSelecionadas: pipelineProfessor.estado?.metricasSelecionadas,
      preProcessamentoConfig: pipelineProfessor.estado?.preProcessamentoConfig,
      resultadoTreinamento: pipelineProfessor.estado?.resultadoTreinamento,
      resultadosDasAvaliacoes: pipelineProfessor.estado?.resultadosDasAvaliacoes,
      status: 'rascunho'
    };
    
    return this.salvarPipeline(novoPipeline);
  }

  // Listar pipelines de professores (galeria)
  listarPipelinesProfessores(): Observable<PipelineProfessor[]> {
    // TODO: Implementar chamada ao backend
    // Por enquanto, dados mockados
    const pipelines: PipelineProfessor[] = [
      {
        id: 'prof-1',
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
        avaliacao: 4.8,
        estado: {
          nome: 'Introdução ao KNN',
          descricao: 'Pipeline didático para KNN',
          resultadoColetaDado: {
            target: 'fruit_name',
            preverCategoria: true,
            dadosRotulados: true,
            colunas: ['mass', 'width', 'height', 'color_score'],
            porcentagemTreino: 70
          },
          modeloSelecionado: {
            valor: 'knn',
            label: 'KNN'
          }
        }
      },
      {
        id: 'prof-2',
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
        avaliacao: 4.6,
        estado: {
          nome: 'Árvore de Decisão na Prática',
          descricao: 'Pipeline para Decision Tree',
          resultadoColetaDado: {
            target: 'approved',
            preverCategoria: true,
            dadosRotulados: true,
            colunas: ['income', 'credit_score', 'employment_years', 'loan_amount'],
            porcentagemTreino: 75
          },
          modeloSelecionado: {
            valor: 'arvore_decisao',
            label: 'Decision Tree'
          }
        }
      },
      {
        id: 'prof-3',
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
        avaliacao: 4.4,
        estado: {
          nome: 'SVM para Classificação de Texto',
          descricao: 'Pipeline para SVM com texto',
          resultadoColetaDado: {
            target: 'sentiment',
            preverCategoria: true,
            dadosRotulados: true,
            colunas: ['text', 'length', 'word_count'],
            porcentagemTreino: 80
          },
          modeloSelecionado: {
            valor: 'svm',
            label: 'SVM'
          }
        }
      },
      {
        id: 'prof-4',
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
        avaliacao: 4.9,
        estado: {
          nome: 'Random Forest Avançado',
          descricao: 'Pipeline avançado para Random Forest',
          resultadoColetaDado: {
            target: 'survived',
            preverCategoria: true,
            dadosRotulados: true,
            colunas: ['pclass', 'sex', 'age', 'sibsp', 'parch', 'fare', 'embarked'],
            porcentagemTreino: 70
          },
          modeloSelecionado: {
            valor: 'random_forest',
            label: 'Random Forest'
          }
        }
      }
    ];
    
    return of(pipelines);
  }

  // Limpar pipeline atual
  limparPipelineAtual(): void {
    this.pipelineAtual.next(null);
  }

  // Métodos privados para localStorage
  private getPipelinesLocalStorage(): PipelineState[] {
    const stored = localStorage.getItem('iana_pipelines');
    return stored ? JSON.parse(stored) : [];
  }

  private salvarPipelinesLocalStorage(pipelines: PipelineState[]): void {
    localStorage.setItem('iana_pipelines', JSON.stringify(pipelines));
  }
}
