import { Component, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../service/auth/auth.service';

/**
 * Menu do usuário (avatar + dropdown + Sair) reutilizável. Encapsula o padrão que
 * era duplicado no dashboard/execucoes. Usado na galeria, no view-admin e onde mais
 * precisar de um menu de usuário consistente.
 */
@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
  standalone: false,
})
export class UserMenuComponent {
  usuarioMenuAberto = false;
  nomeUsuario = 'Usuario';
  emailUsuario = '';
  roleUsuario = '';

  constructor(private router: Router, private authService: AuthService) {
    this.nomeUsuario = sessionStorage.getItem('name') || 'Usuario';
    this.emailUsuario = sessionStorage.getItem('email') || '';
    this.roleUsuario = this.authService.getUsuarioRole();
  }

  @HostListener('document:click', ['$event'])
  fecharAoClicarFora(event: Event): void {
    if (!(event.target as HTMLElement).closest('.usuario-menu')) {
      this.usuarioMenuAberto = false;
    }
  }

  get iniciaisUsuario(): string {
    const partes = this.nomeUsuario.trim().split(/\s+/).filter(Boolean);
    if (partes.length >= 2) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    return (partes[0]?.substring(0, 2) || 'A').toUpperCase();
  }

  get papelUsuario(): string {
    const papeis: Record<string, string> = { aluno: 'Aluno', professor: 'Professor', admin: 'Admin' };
    return papeis[this.roleUsuario] || this.roleUsuario || 'Aluno';
  }

  get usuarioAdmin(): boolean { return this.roleUsuario === 'admin'; }
  /** Professor e admin gerenciam Turmas & Atividades. */
  get usuarioProfessorOuAdmin(): boolean { return this.roleUsuario === 'professor' || this.roleUsuario === 'admin'; }

  alternar(event: Event): void {
    event.stopPropagation();
    this.usuarioMenuAberto = !this.usuarioMenuAberto;
  }

  navegarParaProjetos(): void { this.usuarioMenuAberto = false; this.router.navigate(['/view-aluno/projetos']); }
  navegarParaGaleria(): void { this.usuarioMenuAberto = false; this.router.navigate(['/view-aluno/galeria']); }
  navegarParaTurmas(): void { this.usuarioMenuAberto = false; this.router.navigate(['/view-aluno/entrar']); }
  navegarGerenciarTurmas(): void { this.usuarioMenuAberto = false; this.router.navigate(['/view-professor']); }
  navegarParaAdmin(): void { this.usuarioMenuAberto = false; this.router.navigate(['/view-admin']); }
  navegarParaUsuarios(): void { this.usuarioMenuAberto = false; this.router.navigate(['/view-admin/usuarios']); }
  navegarParaSobre(): void { this.usuarioMenuAberto = false; this.router.navigate(['/sobre']); }
  sair(): void { this.authService.logout(); }
}
