import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  is_public?: boolean;
  atividade_id?: string;
  turma_id?: string;
}

/** Uma tentativa do aluno numa base (o backend devolve em ordem cronológica). */
export interface EvolucaoTentativa {
  pipeline_id: string;
  nome?: string;
  data?: string;
  valor: number | null;
  modelos: string[];
  pre_processamento: string[];
  divisao_treino?: number;
  /** O que mudou em relação à tentativa anterior ("trocou o modelo", …). */
  mudancas: string[];
}

/**
 * Trajetória numa base+alvo. Tudo é RELATIVO de propósito: métrica crua não é comparável
 * entre bases, então o que vale é o ganho sobre o chute burro e sobre a própria tentativa
 * anterior. `delta_*` já vem com sinal positivo = melhorou, inclusive para métricas em que
 * menor é melhor (MAE, por exemplo).
 */
export interface EvolucaoBase {
  dataset: string;
  alvo: string;
  tarefa: 'classificacao' | 'regressao' | 'agrupamento';
  metrica: string;
  ordem: 'asc' | 'desc';
  /** Quanto o "chute burro" faria nesta base (null quando não dá para saber barato). */
  baseline: number | null;
  melhor: number;
  ultima: number;
  delta_vs_anterior: number | null;
  delta_vs_baseline: number | null;
  tentativas: EvolucaoTentativa[];
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
    // Barra final: a rota é POST /pipelines/ e, atrás do nginx (prefixo /h2ia/api),
    // o redirect 307 sem-barra perde o prefixo e vira 404.
    return this.http.post<PipelineState>(`${this.endpoint}/`, state).pipe(
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
    return this.http.get<PipelineState[]>(`${this.endpoint}/`);
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

  /**
   * Trajetória do próprio aluno (Fase 2 dos desafios). Passando `datasets` (os nomes que o
   * cliente conhece da base atual) e `alvo`, o SERVIDOR decide qual base corresponde — a
   * regra de identidade não é duplicada aqui.
   */
  evolucao(datasets: string[] = [], alvo?: string): Observable<{ bases: EvolucaoBase[] }> {
    let params = new HttpParams();
    datasets.filter(Boolean).forEach(d => params = params.append('dataset', d));
    if (alvo) { params = params.set('alvo', alvo); }
    return this.http.get<{ bases: EvolucaoBase[] }>(`${this.endpoint}/evolucao`, { params });
  }

  limparPipelineAtual(): void {
    this.pipelineAtual.next(null);
  }
}
