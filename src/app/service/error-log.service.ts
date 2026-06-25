import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface ErrorLog {
  message: string;
  status?: number;
  url?: string;
  stack?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorLogService {
  private apiUrl = environment.apiUrl + '/sistema';

  constructor(private http: HttpClient) {}

  logError(error: ErrorLog) {
    // Fire and forget, suppressar erros do envio de erro para evitar loops
    this.http.post(`${this.apiUrl}/erro`, error).subscribe({
      error: (e) => console.error('Falha ao enviar log de erro ao servidor', e)
    });
  }

  getLogsBackend(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/logs-backend`);
  }
}
