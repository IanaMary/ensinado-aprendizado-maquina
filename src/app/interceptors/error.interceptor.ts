import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorLogService } from '../service/error-log.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private snackBar: MatSnackBar,
    private errorLogService: ErrorLogService
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Ignora erros da própria rota de log de erros
        if (request.url.includes('/sistema/erro')) {
          return throwError(() => error);
        }

        let errorMessage = 'Ocorreu um erro inesperado.';
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Erro: ${error.error.message}`;
        } else {
          if (error.status === 401) {
            errorMessage = 'Sessão expirada ou não autorizada. Faça login novamente.';
          } else if (error.status === 403) {
            errorMessage = 'Acesso negado.';
          } else if (error.error && error.error.detail) {
             if (typeof error.error.detail === 'string') {
                 errorMessage = error.error.detail;
             } else {
                 errorMessage = 'Erro de validação nos dados enviados.';
             }
          } else {
            errorMessage = `Falha de comunicação com o servidor (Código: ${error.status}).`;
          }
        }

        // Exibe erro na interface
        this.snackBar.open(errorMessage, 'Fechar', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'bottom'
        });

        // Envia para o painel de telemetria
        this.errorLogService.logError({
          message: error.message || errorMessage,
          status: error.status,
          url: request.url,
          stack: error.error?.stack || null
        });

        return throwError(() => error);
      })
    );
  }
}
