import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Consome o endpoint de resumo de run do MLflow (GET /tutor/artefatos/{run_id}). */
@Injectable({ providedIn: 'root' })
export class ArtefatosService {
  constructor(private http: HttpClient) {}

  obterRun(runId: string) {
    return this.http.get<any>(`${environment.apiUrl}tutor/artefatos/${encodeURIComponent(runId)}`);
  }
}
