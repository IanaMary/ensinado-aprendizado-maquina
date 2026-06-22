import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth/auth.service';
import { NotificacaoService } from '../service/notificacao.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificacao: NotificacaoService
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

    return next.handle(req).pipe(
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
        } else if (err.status === 403) {
          console.warn('Acesso negado (403)');
          this.notificacao.erro('Você não tem permissão para esta ação.');
        }
        return throwError(() => err);
      })
    );
  }
}
