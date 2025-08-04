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
    const isAuthenticated: boolean = await this.authService.isAuthenticated();

    if (!isAuthenticated) {
      this.router.navigate(['/autenticacao/login']);
      return false;
    }

    const role = this.authService.getUsuarioRole();
    const firstSegment = segments[0]?.path;

    const requiredRole = roleMap[firstSegment];

    if (requiredRole && role !== requiredRole) {
      this.router.navigate(['/autenticacao/login']);
      return false;
    }

    return true;
  }
}
