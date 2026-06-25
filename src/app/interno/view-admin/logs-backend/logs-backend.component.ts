import { Component, OnInit } from '@angular/core';
import { ErrorLogService } from '../../../service/error-log.service';

@Component({
  selector: 'app-logs-backend',
  templateUrl: './logs-backend.component.html',
  styleUrls: ['./logs-backend.component.scss'],
  standalone: false
})
export class LogsBackendComponent implements OnInit {
  logs: any[] = [];
  isLoading = true;
  displayedColumns: string[] = ['time', 'level', 'module', 'function', 'message'];

  constructor(private errorLogService: ErrorLogService) { }

  ngOnInit(): void {
    this.carregarLogs();
  }

  carregarLogs(): void {
    this.isLoading = true;
    this.errorLogService.getLogsBackend().subscribe({
      next: (dados: any[]) => {
        this.logs = dados;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erro ao carregar logs do backend', err);
        this.isLoading = false;
      }
    });
  }

  getLevelColor(level: string): string {
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
        return 'warn';
      case 'WARNING':
        return 'accent';
      case 'INFO':
      case 'DEBUG':
      default:
        return 'primary';
    }
  }
}
