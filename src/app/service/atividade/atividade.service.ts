import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export interface EventoAtividade {
  tipo: string;               // "chat" | "pipeline" | "navegacao" | "http" | "ui" | "erro"
  acao: string;
  detalhes?: any;
  pipeline_id?: string | null;
  duracao_ms?: number;
  status?: 'sucesso' | 'erro';
  erro?: string;
  timestamp_cliente?: string;
}

/**
 * Registra a jornada do aluno (ações, navegação, erros, tempo "preso" em ações)
 * num buffer que é enviado em lote para o backend. Mede a duração de ações
 * específicas via iniciarAcao/finalizarAcao. Só envia quando há usuário autenticado.
 */
@Injectable({ providedIn: 'root' })
export class AtividadeService {
  private readonly endpoint = `${environment.apiUrl}atividades`;
  private buffer: EventoAtividade[] = [];
  private readonly LIMITE_BUFFER = 10;
  private readonly INTERVALO_MS = 15000;
  private readonly MAX_BUFFER = 200;            // teto p/ não crescer sem limite (re-enfileiramento)
  private readonly KEEPALIVE_MAX_BYTES = 50000; // < 64KB do fetch keepalive
  private readonly acoesEmCurso = new Map<string, number>();

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
  ) {
    // Flush periódico
    setInterval(() => this.flush(), this.INTERVALO_MS);

    // Flush ao sair / esconder a aba (não perde os últimos eventos)
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flushSync();
        }
      });
      window.addEventListener('beforeunload', () => this.flushSync());
    }

    // Telemetria de navegação (permite medir tempo por página). O `?.` torna o
    // serviço resiliente a um Router sem `events` (stubs de teste / SSR).
    this.router.events
      ?.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      ?.subscribe((e) => this.registrar('navegacao', 'trocou_pagina', { url: e.urlAfterRedirects }));
  }

  /** Enfileira um evento. */
  registrar(tipo: string, acao: string, detalhes?: any, extras?: Partial<EventoAtividade>): void {
    if (!this.auth.getToken()) {
      return; // só registra usuários autenticados
    }
    this.buffer.push({
      tipo,
      acao,
      detalhes,
      timestamp_cliente: new Date().toISOString(),
      ...extras,
    });
    // Teto duro: se o buffer estourar (ex.: flushes falhando), descarta os mais antigos.
    if (this.buffer.length > this.MAX_BUFFER) {
      this.buffer.splice(0, this.buffer.length - this.MAX_BUFFER);
    }
    if (this.buffer.length >= this.LIMITE_BUFFER) {
      this.flush();
    }
  }

  /** Marca o início de uma ação para medir sua duração ("tempo preso"). */
  iniciarAcao(chave: string): void {
    this.acoesEmCurso.set(chave, performance.now());
  }

  /** Encerra uma ação iniciada e registra um evento com a duração medida. */
  finalizarAcao(
    chave: string,
    detalhes?: any,
    opts?: { tipo?: string; acao?: string; status?: 'sucesso' | 'erro'; erro?: string; pipeline_id?: string | null },
  ): void {
    const inicio = this.acoesEmCurso.get(chave);
    if (inicio === undefined) {
      return;
    }
    this.acoesEmCurso.delete(chave);
    const duracao_ms = Math.round(performance.now() - inicio);
    this.registrar(opts?.tipo ?? 'pipeline', opts?.acao ?? chave, detalhes, {
      duracao_ms,
      status: opts?.status ?? 'sucesso',
      erro: opts?.erro,
      pipeline_id: opts?.pipeline_id,
    });
  }

  /** Descarta uma ação em curso sem registrar (ex.: usuário cancelou). */
  cancelarAcao(chave: string): void {
    this.acoesEmCurso.delete(chave);
  }

  /** Envia o buffer atual (assíncrono). Em falha, re-enfileira (não perde eventos). */
  flush(): void {
    if (!this.buffer.length || !this.auth.getToken()) {
      return;
    }
    const eventos = this.buffer;
    this.buffer = [];
    this.http.post(`${this.endpoint}/lote`, { eventos }).subscribe({
      error: () => {
        // Falha transitória: devolve os eventos ao início do buffer (cap em MAX_BUFFER,
        // mantendo os mais recentes) para tentar de novo no próximo flush.
        this.buffer = [...eventos, ...this.buffer].slice(-this.MAX_BUFFER);
      },
    });
  }

  /** Envio resiliente ao fechar/esconder a aba (fetch keepalive carrega o header). */
  private flushSync(): void {
    const token = this.auth.getToken();
    if (!this.buffer.length || !token) {
      return;
    }
    const eventos = this.buffer;
    this.buffer = [];
    // O keepalive limita o corpo total (~64KB): envia em pedaços sob o budget.
    for (const chunk of this.fragmentar(eventos)) {
      try {
        fetch(`${this.endpoint}/lote`, {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ eventos: chunk }),
        }).catch(() => { /* ignora */ });
      } catch {
        /* ignora */
      }
    }
  }

  /** Divide os eventos em lotes cujo corpo serializado fica abaixo do budget de keepalive. */
  private fragmentar(eventos: EventoAtividade[]): EventoAtividade[][] {
    const chunks: EventoAtividade[][] = [];
    let atual: EventoAtividade[] = [];
    let bytes = 0;
    for (const ev of eventos) {
      const tam = JSON.stringify(ev).length + 1;
      if (atual.length && bytes + tam > this.KEEPALIVE_MAX_BYTES) {
        chunks.push(atual);
        atual = [];
        bytes = 0;
      }
      atual.push(ev);
      bytes += tam;
    }
    if (atual.length) {
      chunks.push(atual);
    }
    return chunks;
  }

  // ---- Consulta (tela admin) ----
  listar(filtros: { [k: string]: any } = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    return this.http.get<any>(`${this.endpoint}${qs ? '?' + qs : ''}`);
  }

  resumo(filtros: { [k: string]: any } = {}) {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    const qs = params.toString();
    return this.http.get<any>(`${this.endpoint}/resumo${qs ? '?' + qs : ''}`);
  }
}
