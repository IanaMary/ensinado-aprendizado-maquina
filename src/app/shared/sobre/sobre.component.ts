import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../service/auth/auth.service';
import { roleMap } from '../../models/item-coleta-dado.model';

/**
 * Tela "Sobre" — apresenta o trabalho de mestrado que originou a plataforma.
 * Rota pública `/sobre`, acessível a partir do login e dos menus do app.
 */
@Component({
  selector: 'app-sobre',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './sobre.component.html',
  styleUrls: ['./sobre.component.scss'],
})
export class SobreComponent {
  constructor(private router: Router, private auth: AuthService) {}

  /**
   * Sempre navega PARA DENTRO do app (home do papel ou login) — nunca history.back():
   * a página é pública/compartilhável, e quem chega de um link externo tem histórico
   * de outra origem na aba; back() jogaria a pessoa para fora da plataforma.
   */
  voltar(): void {
    const role = this.auth.getUsuarioRole();
    this.router.navigateByUrl((role && roleMap[role]) || '/autenticacao/login');
  }
}
