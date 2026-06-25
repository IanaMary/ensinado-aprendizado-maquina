import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface ErrorLogResponse {
  id: string;
  message: string;
  status?: number;
  url?: string;
  stack?: string;
  timestamp: string;
}

@Component({
  selector: 'app-logs-erros',
  templateUrl: './logs-erros.component.html',
  styleUrls: ['./logs-erros.component.scss'],
  standalone: false
})
export class LogsErrosComponent implements OnInit {
  erros: ErrorLogResponse[] = [];
  displayedColumns: string[] = ['timestamp', 'status', 'url', 'message'];
  isLoading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.carregarErros();
  }

  carregarErros(): void {
    this.isLoading = true;
    this.http.get<ErrorLogResponse[]>(`${environment.apiUrl}/sistema/erros`).subscribe({
      next: (dados) => {
        this.erros = dados;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
