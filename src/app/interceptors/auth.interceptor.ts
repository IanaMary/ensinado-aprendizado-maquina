import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../service/auth/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService) { }

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
        }
        // Aviso ao usuário é do ErrorInterceptor. Toastar aqui também mostrava DOIS
        // toasts (com textos diferentes) para o mesmo 403.
        return throwError(() => err);
      })
    );
  }
}
