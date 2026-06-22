import { Injectable, Injector } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AtividadeService } from '../service/atividade/atividade.service';

/**
 * Registra cada chamada HTTP (duração + status) como atividade. No erro, grava
 * o motivo. Pula requisições de telemetria (/atividades) para evitar recursão.
 *
 * Usa Injector lazy para resolver o AtividadeService apenas em runtime — evita o
 * ciclo de DI (interceptor -> serviço -> HttpClient -> interceptor).
 */
@Injectable()
export class AtividadeInterceptor implements HttpInterceptor {
  private atividade?: AtividadeService;

  // Rotas ignoradas: a própria telemetria (evita laço) e pollers ruidosos de alta
  // frequência (ex.: health-check de modelos do tutor) que não têm valor pedagógico.
  private readonly IGNORAR = ['/atividades', '/tutor/modelos/saude'];

  constructor(private injector: Injector) {}

  private get svc(): AtividadeService {
    if (!this.atividade) {
      this.atividade = this.injector.get(AtividadeService);
    }
    return this.atividade;
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Não registrar a própria telemetria nem pollers ruidosos (evita laço/ruído).
    if (this.IGNORAR.some((p) => req.url.includes(p))) {
      return next.handle(req);
    }

    const inicio = performance.now();
    const base = { url: req.url, metodo: req.method };

    return next.handle(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.svc.registrar('http', `${req.method} ${this.rotaCurta(req.url)}`, {
            ...base,
            status_http: event.status,
          }, { duracao_ms: Math.round(performance.now() - inicio), status: 'sucesso' });
        }
      }),
      catchError((err: HttpErrorResponse) => {
        this.svc.registrar('http', `${req.method} ${this.rotaCurta(req.url)}`, {
          ...base,
          status_http: err.status,
        }, {
          duracao_ms: Math.round(performance.now() - inicio),
          status: 'erro',
          erro: err.status ? `HTTP ${err.status}` : 'rede/sem resposta',
        });
        return throwError(() => err);
      }),
    );
  }

  /**
   * Encurta a URL para a rota (sem host/querystring) e normaliza segmentos
   * dinâmicos (ids numéricos, ObjectId, tokens longos) para `:id`, evitando
   * cardinalidade ilimitada de `acao` na agregação por_acao.
   */
  private rotaCurta(url: string): string {
    let pathname: string;
    try {
      pathname = new URL(url, 'http://x').pathname;
    } catch {
      pathname = url.split('?')[0];
    }
    return pathname
      .split('/')
      .map((seg) => {
        if (/^\d+$/.test(seg)) return ':id';                 // numérico
        if (/^[0-9a-f]{24}$/i.test(seg)) return ':id';        // ObjectId
        if (seg.length > 20) return ':id';                    // tokens longos
        return seg;
      })
      .join('/');
  }
}
