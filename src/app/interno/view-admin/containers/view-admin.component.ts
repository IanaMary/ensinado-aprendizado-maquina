import { Component, HostListener, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth/auth.service';

@Component({
  selector: 'app-view-admin',
  templateUrl: './view-admin.component.html',
  styleUrls: ['./view-admin.component.scss'],
  standalone: false
})
export class ViewAdminComponent implements OnInit {
  nome = (() => {
    try {
      const u = JSON.parse(sessionStorage.getItem('usuario') || '{}');
      return u?.usuario?.nome || u?.nome || '';
    } catch {
      return '';
    }
  })();
  email = sessionStorage.getItem('email') || '';

  menuAberto = false;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService) { }

  ngOnInit() { }

  get iniciais(): string {
    const base = (this.nome || this.email || 'A').trim();
    return base.slice(0, 2).toUpperCase();
  }

  navegar(rota: string) {
    // Caminho absoluto (começa com '/') navega a partir da raiz; relativo, a partir daqui.
    if (rota.startsWith('/')) {
      this.router.navigate([rota]);
      return;
    }
    this.router.navigate([rota], { relativeTo: this.route });
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.menuAberto = !this.menuAberto;
  }

  @HostListener('document:click')
  fecharMenu(): void {
    this.menuAberto = false;
  }

  sair(): void {
    this.auth.limparSessionStorage();
    this.router.navigate(['/autenticacao/login']);
  }
}
