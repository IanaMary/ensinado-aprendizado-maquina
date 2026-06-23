import { Component } from '@angular/core';
import { ArtefatosService } from '../../../service/artefatos/artefatos.service';

@Component({
  selector: 'app-artefatos',
  templateUrl: './artefatos.component.html',
  styleUrls: ['./artefatos.component.scss'],
  standalone: false,
})
export class ArtefatosComponent {
  runId = '';
  carregando = false;
  erro = '';
  resumo: any = null;

  constructor(private artefatos: ArtefatosService) {}

  buscar(): void {
    const id = (this.runId || '').trim();
    if (!id) {
      this.erro = 'Informe o run_id.';
      this.resumo = null;
      return;
    }
    this.carregando = true;
    this.erro = '';
    this.resumo = null;
    this.artefatos.obterRun(id).subscribe({
      next: (r) => {
        this.resumo = r;
        this.carregando = false;
      },
      error: (e) => {
        this.carregando = false;
        const s = e?.status;
        this.erro =
          s === 503 ? 'O MLflow não está configurado no servidor (defina MLFLOW_TRACKING_URI).'
          : s === 404 ? 'Run não encontrada.'
          : s === 400 ? 'run_id inválido.'
          : (e?.error?.detail || 'Falha ao buscar os artefatos.');
      },
    });
  }

  /** Converte um dict {chave: valor} em lista para *ngFor. */
  entries(obj: any): { chave: string; valor: any }[] {
    if (!obj) return [];
    return Object.keys(obj).map((k) => ({ chave: k, valor: obj[k] }));
  }

  formatarData(ms: number): string {
    if (ms === null || ms === undefined) return '—';
    try {
      return new Date(ms).toLocaleString('pt-BR');
    } catch {
      return String(ms);
    }
  }

  /** Tamanho em bytes legível; diretórios vêm com file_size null. */
  formatarTamanho(bytes: number | null): string {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
