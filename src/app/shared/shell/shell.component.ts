import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../service/auth/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

interface NavItem {
  icon: string;
  label: string;
  route: string;
  roles: string[];
}

interface MenuItem {
  icon: string;
  label: string;
  route?: string;
  action?: string;
  divider?: boolean;
  roles?: string[];
}

@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
  standalone: false
})
export class ShellComponent implements OnInit, OnDestroy {
  sidebarCollapsed = false;
  userRole = '';
  userName = '';
  userEmail = '';
  currentRoute = '';
  userMenuOpen = false;
  private routerSub?: Subscription;

  navItems: NavItem[] = [
    { icon: 'home', label: 'Home', route: '/view-aluno', roles: ['aluno', 'professor'] },
    { icon: 'home', label: 'Home', route: '/view-admin', roles: ['admin'] },
    { icon: 'dashboard', label: 'Pipeline', route: '/view-aluno', roles: ['aluno', 'professor'] },
    { icon: 'dashboard', label: 'Pipeline', route: '/view-admin', roles: ['admin'] },
    { icon: 'analytics', label: 'Resultados', route: '/view-aluno', roles: ['aluno', 'professor'] },
    { icon: 'analytics', label: 'Resultados', route: '/view-admin', roles: ['admin'] },
    { icon: 'settings', label: 'Configuracao', route: '/view-admin', roles: ['admin'] }
  ];

  menuItems: MenuItem[] = [
    { icon: 'person', label: 'Meu Perfil', route: '/perfil', roles: ['aluno', 'professor', 'admin'] },
    { icon: 'folder', label: 'Meus Projetos', route: '/view-aluno/projetos', roles: ['aluno', 'professor', 'admin'] },
    { icon: 'explore', label: 'Galeria de Pipelines', route: '/view-aluno/galeria', roles: ['aluno', 'professor'] },
    { icon: 'divider', label: '', divider: true, roles: ['aluno', 'professor', 'admin'] },
    { icon: 'help', label: 'Manual', action: 'manual', roles: ['aluno', 'professor', 'admin'] },
    { icon: 'admin_panel_settings', label: 'Painel Admin', route: '/view-admin', roles: ['admin'] },
    { icon: 'people', label: 'Gerenciar Usuários', route: '/view-admin/usuarios', roles: ['admin'] },
    { icon: 'divider', label: '', divider: true, roles: ['admin'] },
    { icon: 'logout', label: 'Sair', action: 'logout', roles: ['aluno', 'professor', 'admin'] }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getUsuarioRole();
    this.userName = sessionStorage.getItem('name') || 'Usuario';
    this.userEmail = sessionStorage.getItem('email') || 'usuario@email.com';
    this.currentRoute = this.router.url;

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects || event.url;
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.userMenuOpen = false;
    }
  }

  get filteredNavItems(): NavItem[] {
    return this.navItems.filter(item => item.roles.includes(this.userRole));
  }

  get filteredMenuItems(): MenuItem[] {
    return this.menuItems.filter(item => !item.roles || item.roles.includes(this.userRole));
  }

  get userInitials(): string {
    const parts = this.userName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return this.userName.substring(0, 2).toUpperCase();
  }

  get roleLabel(): string {
    const labels: Record<string, string> = {
      'aluno': 'Aluno',
      'professor': 'Professor',
      'admin': 'Administrador'
    };
    return labels[this.userRole] || this.userRole;
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  navigate(route: string): void {
    this.userMenuOpen = false;
    this.router.navigate([route]);
  }

  executeAction(action: string): void {
    this.userMenuOpen = false;
    switch (action) {
      case 'manual':
        this.abrirManual();
        break;
      case 'logout':
        this.logout();
        break;
    }
  }

  abrirManual(): void {
    this.router.navigate(['/manual'], { 
      queryParams: { tipo: this.userRole } 
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
