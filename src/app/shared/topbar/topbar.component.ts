import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

/**
 * Barra superior padrão das telas internas: botão voltar (à esquerda, no topo),
 * símbolo da marca, título/subtítulo e o menu do usuário à direita. Ações extras
 * da tela entram por <ng-content>.
 */
@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  standalone: false,
})
export class TopbarComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  /** Rota do botão voltar; sem valor, o botão não aparece. */
  @Input() voltarPara: string | null = null;

  constructor(private router: Router) {}

  voltar(): void {
    if (this.voltarPara) this.router.navigateByUrl(this.voltarPara);
  }
}
