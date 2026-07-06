import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Consome os endpoints de artefatos do MLflow. */
@Injectable({ providedIn: 'root' })
export class ArtefatosService {
  private readonly endpoint = `${environment.apiUrl}tutor/artefatos`;

  constructor(private http: HttpClient) {}

  /** Lista runs associadas a usuários (filtro por usuário e data). */
  listar(filtros: Record<string, any> = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    return this.http.get<any>(`${this.endpoint}${qs ? '?' + qs : ''}`);
  }

  /** Valores distintos p/ os filtros (modelos, papéis). */
  getFacetas() {
    return this.http.get<{ modelos: string[]; papeis: string[]; datasets: string[] }>(`${this.endpoint}/facetas`);
  }

  /** Busca leve de usuários (autocomplete do filtro) — escala p/ milhares. */
  buscarUsuarios(q: string) {
    return this.http.get<{ id: string; nome: string; email: string }[]>(
      `${this.endpoint}/usuarios?q=${encodeURIComponent(q)}&limit=20`);
  }

  /** Resumo detalhado de uma run específica. */
  obterRun(runId: string) {
    return this.http.get<any>(`${this.endpoint}/${encodeURIComponent(runId)}`);
  }

  /** Submissões de atividade/turma que usaram esta run. */
  contextoRun(runId: string) {
    return this.http.get<{ vinculos: any[] }>(`${this.endpoint}/${encodeURIComponent(runId)}/contexto`);
  }
}
