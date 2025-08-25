import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  constructor(private snackBar: MatSnackBar) { }

  sucesso(mensagem: string) {
    this.snackBar.open(mensagem, 'Fechar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['toast-sucesso'],
    });
  }

  erro(mensagem: string) {
    this.snackBar.open(mensagem, 'Fechar', {
      duration: 5000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: ['toast-erro'],
    });
  }

  aviso(mensagem: string) {
    this.snackBar.open(mensagem, 'Ok', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['toast-aviso'],
    });
  }
}
