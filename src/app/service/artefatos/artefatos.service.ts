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

  /** Resumo detalhado de uma run específica. */
  obterRun(runId: string) {
    return this.http.get<any>(`${this.endpoint}/${encodeURIComponent(runId)}`);
  }
}
