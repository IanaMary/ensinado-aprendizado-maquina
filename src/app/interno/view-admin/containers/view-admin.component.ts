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
  usuarioMenuAberto = false;
  nomeUsuario = 'Usuario';
  emailUsuario = '';
  roleUsuario = '';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService) { }

  ngOnInit() {
    this.nomeUsuario = sessionStorage.getItem('name') || 'Usuario';
    this.emailUsuario = sessionStorage.getItem('email') || '';
    this.roleUsuario = this.authService.getUsuarioRole();
  }

  @HostListener('document:click', ['$event'])
  fecharMenuAoClicarFora(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.usuario-menu')) {
      this.usuarioMenuAberto = false;
    }
  }

  get iniciaisUsuario(): string {
    const partes = this.nomeUsuario.trim().split(/\s+/).filter(Boolean);
    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    }
    return (partes[0]?.substring(0, 2) || 'A').toUpperCase();
  }

  get papelUsuario(): string {
    const papeis: Record<string, string> = {
      aluno: 'Aluno',
      professor: 'Professor',
      admin: 'Admin'
    };
    return papeis[this.roleUsuario] || this.roleUsuario || 'Aluno';
  }

  navegar(rota: string) {
    // Caminho absoluto (começa com '/') navega a partir da raiz; relativo, a partir daqui.
    if (rota.startsWith('/')) {
      this.router.navigate([rota]);
      return;
    }
    this.router.navigate([rota], { relativeTo: this.route });
  }

  alternarMenuUsuario(event: Event): void {
    event.stopPropagation();
    this.usuarioMenuAberto = !this.usuarioMenuAberto;
  }

  navegarParaProjetos(): void {
    this.usuarioMenuAberto = false;
    this.router.navigate(['/view-aluno/projetos']);
  }

  navegarParaGaleria(): void {
    this.usuarioMenuAberto = false;
    this.router.navigate(['/view-aluno/galeria']);
  }

  navegarParaUsuarios(): void {
    this.usuarioMenuAberto = false;
    this.router.navigate(['/view-admin/usuarios']);
  }

  sair(): void {
    this.usuarioMenuAberto = false;
    this.authService.logout();
  }
}