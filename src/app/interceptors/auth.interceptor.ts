import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../service/auth/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) { }

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
        // Não redirecionar para login em endpoints públicos
        const isPublicEndpoint = req.url.includes('/convite/') || 
                                  req.url.includes('/login') ||
                                  req.url.includes('/ativar-conta');
        
        if (err.status === 401 && !isPublicEndpoint) {
          this.authService.logout();
        } else if (err.status === 403) {
          console.warn('Acesso negado (403)');
        }
        return throwError(() => err);
      })
    );
  }
}
