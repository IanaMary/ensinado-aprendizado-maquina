import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { MediaMetrica } from '../models/item-coleta-dado.model';

export interface PipelineState {
  id?: string;
  nome: string;
  descricao?: string;
  resultadoColetaDado?: any;
  coletaId?: string;            // id do arquivo no backend (p/ re-treinar um projeto salvo)
  configId?: string;            // id da configuração de treino
  modeloSelecionado?: any;
  modelosSelecionados?: any[];  // Trilha: vários modelos (ramos). Clássico usa modeloSelecionado.
  metricasSelecionadas?: any[];
  mediaMetricas?: MediaMetrica;
  preProcessamentoConfig?: any;
  resultadoTreinamento?: any;
  resultadosDasAvaliacoes?: any;
  dataCriacao?: string;
  dataModificacao?: string;
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
  dataCriacao: string;
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

  private readonly endpoint = `${environment.apiUrl}pipelines`;

  constructor(private http: HttpClient) {}

  salvarPipeline(state: PipelineState): Observable<PipelineState> {
    if (state.id) {
      return this.http.put<PipelineState>(`${this.endpoint}/${state.id}`, state).pipe(
        tap(saved => this.pipelineAtual.next(saved))
      );
    }
    return this.http.post<PipelineState>(this.endpoint, state).pipe(
      tap(saved => this.pipelineAtual.next(saved))
    );
  }

  carregarPipeline(id: string): Observable<PipelineState | null> {
    return this.http.get<PipelineState>(`${this.endpoint}/${id}`).pipe(
      tap(pipeline => this.pipelineAtual.next(pipeline)),
      map(pipeline => pipeline || null)
    );
  }

  listarPipelines(): Observable<PipelineState[]> {
    return this.http.get<PipelineState[]>(this.endpoint);
  }

  excluirPipeline(id: string): Observable<boolean> {
    return this.http.delete<{ mensagem: string }>(`${this.endpoint}/${id}`).pipe(
      map(() => true)
    );
  }

  copiarPipeline(id: string): Observable<PipelineState> {
    return this.http.post<PipelineState>(`${this.endpoint}/${id}/copiar`, {});
  }

  listarPipelinesProfessores(): Observable<PipelineProfessor[]> {
    return this.http.get<PipelineProfessor[]>(`${this.endpoint}/galeria`);
  }

  limparPipelineAtual(): void {
    this.pipelineAtual.next(null);
  }
}
