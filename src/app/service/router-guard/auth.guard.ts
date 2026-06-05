import { Injectable } from '@angular/core';
import { CanLoad, Route, UrlSegment, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { roleMap } from '../../../app/models/item-coleta-dado.model';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanLoad {
  constructor(private authService: AuthService, private router: Router) { }

  async canLoad(route: Route, segments: UrlSegment[]): Promise<boolean> {
    const autenticado: boolean = await this.authService.autenticado();
    console.log('[AuthGuard] canLoad chamado. segments:', segments, 'autenticado:', autenticado);

    if (!autenticado) {
      console.warn('[AuthGuard] Não autenticado, redirecionando para login');
      this.router.navigate(['/autenticacao/login']);
      return false;
    }

    const role = this.authService.getUsuarioRole();
    const firstSegment = segments[0]?.path;

    const requiredRole = roleMap[firstSegment];

    if (requiredRole && role !== requiredRole) {
      console.warn(`[AuthGuard] Acesso negado: role '${role}' não tem permissão para '${firstSegment}'`);
      this.router.navigate(['/autenticacao/login']);
      return false;
    }

    console.log('[AuthGuard] Acesso permitido. role:', role, 'rota:', firstSegment);
    return true;
  }
}

