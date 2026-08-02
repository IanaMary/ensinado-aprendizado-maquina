import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../service/auth/auth.service';
import { SessaoRenovacaoService } from '../service/auth/sessao-renovacao.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private renovacao: SessaoRenovacaoService,
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // A própria atividade do usuário mantém a sessão viva: se o token está perto de expirar,
    // renova em segundo plano. Não entra em /login/renovar (evita laço) nem na telemetria
    // (/atividades sobe em background e não representa interação).
    const contaComoUso = token
      && !req.url.includes('/login')
      && !req.url.includes('/atividades');

    return next.handle(req).pipe(
      tap(() => { if (contaComoUso) this.renovacao.aoUsar(); }),
      catchError(err => {
        // Não redirecionar para login em endpoints públicos. /atividades é
        // telemetria fire-and-forget (flush em background): um 401 nela não deve
        // deslogar o usuário no meio de uma tarefa.
        const isPublicEndpoint = req.url.includes('/convite/') ||
                                  req.url.includes('/login') ||
                                  req.url.includes('/ativar-conta') ||
                                  req.url.includes('/atividades');
        
        if (err.status === 401 && !isPublicEndpoint) {
          this.authService.logout();
        }
        // Aviso ao usuário é do ErrorInterceptor. Toastar aqui também mostrava DOIS
        // toasts (com textos diferentes) para o mesmo 403.
        return throwError(() => err);
      })
    );
  }
}
