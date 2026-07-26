import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Turma {
  id: string;
  nome: string;
  descricao?: string;
  codigo: string;
  professor_id?: string;
  alunos?: string[];
  total_alunos?: number;
  alunos_detalhe?: { id: string; nome?: string; email?: string }[];
  criado_em?: string;
}

/** Lanes do desafio — espelham as colunas do dashboard (backend: app/desafios/catalogo.py). */
export type LaneDesafio = 'coleta' | 'pre_processamento' | 'modelo' | 'metrica';

export interface GabaritoMontagem {
  tarefa: 'classificacao' | 'regressao' | 'agrupamento';
  exige: LaneDesafio[];
  dados: { faltantes: boolean; texto: boolean; escalas_diferentes: boolean };
  fixar?: string[];
  vetar?: string[];
  dificuldade: 'facil' | 'medio' | 'dificil';
}

export interface Atividade {
  id: string;
  turma_id: string;
  titulo: string;
  descricao?: string;
  /** 'pipeline' = completar e executar um pipeline real; 'montagem' = desafio de blocos. */
  tipo?: 'pipeline' | 'montagem';
  template?: any;
  /** Só chega para professor/admin — o backend omite para o aluno. */
  gabarito?: GabaritoMontagem;
  criterio?: { metrica: string; ordem: string };
  prazo?: string | null;
  criado_em?: string;
}

export interface PecaDesafio {
  valor: string;
  nome: string;
  lane: LaneDesafio;
}

export interface TabuleiroDesafio {
  atividade: { id: string; titulo: string; descricao?: string; tipo: 'montagem' };
  tentativa: number;
  tentativas: number;
  melhor_nota: number | null;
  lanes: LaneDesafio[];
  pecas: PecaDesafio[];
}

export interface RegraAvaliada {
  id: string;
  titulo: string;
  ok: boolean;
  peso: number;
  texto: string;
}

export interface ResultadoMontagem {
  id: string;
  tentativa: number;
  nota: number;
  nota_max: number;
  pontos: number;
  pontos_max: number;
  acertou_tudo: boolean;
  melhor_nota: number;
  regras: RegraAvaliada[];
}

/** Cliente do subsistema de Turmas & Atividades (professor + aluno). */
@Injectable({ providedIn: 'root' })
export class TurmaService {
  private base = `${environment.apiUrl}turmas`;

  constructor(private http: HttpClient) {}

  // ---- professor: turmas
  criarTurma(body: { nome: string; descricao?: string }): Observable<Turma> {
    return this.http.post<Turma>(`${this.base}`, body);
  }
  listarTurmas(): Observable<Turma[]> {
    return this.http.get<Turma[]>(`${this.base}`);
  }
  obterTurma(id: string): Observable<Turma> {
    return this.http.get<Turma>(`${this.base}/${id}`);
  }
  atualizarTurma(id: string, body: { nome?: string; descricao?: string }): Observable<Turma> {
    return this.http.put<Turma>(`${this.base}/${id}`, body);
  }
  excluirTurma(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
  adicionarAlunos(id: string, alunos: string[]): Observable<Turma> {
    return this.http.post<Turma>(`${this.base}/${id}/alunos`, { alunos });
  }
  removerAluno(id: string, alunoId: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}/alunos/${alunoId}`);
  }

  // ---- atividades
  criarAtividade(turmaId: string, body: Partial<Atividade>): Observable<Atividade> {
    return this.http.post<Atividade>(`${this.base}/${turmaId}/atividades`, body);
  }
  listarAtividades(turmaId: string): Observable<Atividade[]> {
    return this.http.get<Atividade[]>(`${this.base}/${turmaId}/atividades`);
  }
  obterAtividade(turmaId: string, atividadeId: string): Observable<Atividade> {
    return this.http.get<Atividade>(`${this.base}/${turmaId}/atividades/${atividadeId}`);
  }
  excluirAtividade(turmaId: string, atividadeId: string): Observable<any> {
    return this.http.delete(`${this.base}/${turmaId}/atividades/${atividadeId}`);
  }
  ranking(turmaId: string, atividadeId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${turmaId}/atividades/${atividadeId}/ranking`);
  }
  progresso(turmaId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/${turmaId}/progresso`);
  }

  // ---- desafio de montagem (quebra-cabeça, sem execução)
  /** Peças embaralhadas da tentativa atual. Não traz gabarito nem o papel das peças. */
  obterTabuleiro(turmaId: string, atividadeId: string): Observable<TabuleiroDesafio> {
    return this.http.get<TabuleiroDesafio>(
      `${this.base}/${turmaId}/atividades/${atividadeId}/tabuleiro`);
  }
  submeterMontagem(turmaId: string, atividadeId: string,
                   montagem: Record<string, string[]>): Observable<ResultadoMontagem> {
    return this.http.post<ResultadoMontagem>(
      `${this.base}/${turmaId}/atividades/${atividadeId}/submeter-montagem`, { montagem });
  }

  // ---- aluno
  entrar(codigo: string): Observable<{ id: string; nome: string }> {
    return this.http.post<{ id: string; nome: string }>(`${this.base}/entrar`, { codigo });
  }
  minhasTurmas(): Observable<Turma[]> {
    return this.http.get<Turma[]>(`${this.base}/minhas`);
  }

  // ---- chat do aluno (professor)
  historicoAluno(alunoId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}tutor/chat/aluno/${alunoId}/historico`);
  }
  historicoAlunoChat(alunoId: string, chatId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}tutor/chat/aluno/${alunoId}/historico/${chatId}`);
  }
}
