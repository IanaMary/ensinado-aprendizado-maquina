import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/**
 * Tela "Sobre" — apresenta o trabalho de mestrado que originou a plataforma.
 * Rota pública `/sobre`, acessível a partir do login e dos menus do app.
 */
@Component({
  selector: 'app-sobre',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './sobre.component.html',
  styleUrls: ['./sobre.component.scss'],
})
export class SobreComponent {
  constructor(private location: Location, private router: Router) {}

  voltar(): void {
    if (history.length > 1) this.location.back();
    else this.router.navigate(['/autenticacao/login']);
  }
}
