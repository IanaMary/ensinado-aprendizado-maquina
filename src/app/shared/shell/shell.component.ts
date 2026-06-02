import { Component, OnInit, OnDestroy } from '@angular/core';
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
  currentRoute = '';
  private routerSub?: Subscription;

  navItems: NavItem[] = [
    { icon: 'home', label: 'Home', route: '/view-aluno', roles: ['aluno', 'professor', 'admin'] },
    { icon: 'dashboard', label: 'Pipeline', route: '/view-aluno', roles: ['aluno', 'professor', 'admin'] },
    { icon: 'analytics', label: 'Resultados', route: '/view-aluno', roles: ['aluno', 'professor', 'admin'] },
    { icon: 'settings', label: 'Configuracao', route: '/view-admin', roles: ['admin'] }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.userRole = this.authService.getUsuarioRole();
    this.userName = sessionStorage.getItem('name') || 'Usuario';
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

  get filteredNavItems(): NavItem[] {
    return this.navItems.filter(item => item.roles.includes(this.userRole));
  }

  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    this.authService.logout();
  }
}
