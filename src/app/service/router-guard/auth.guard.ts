import { Injectable } from '@angular/core';
import { CanLoad, Route, UrlSegment, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

const pathToRole: Record<string, string> = {
  'view-aluno': 'aluno',
  'view-professor': 'professor',
  'view-admin': 'admin'
};

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanLoad {
  constructor(private authService: AuthService, private router: Router) { }

  async canLoad(route: Route, segments: UrlSegment[]): Promise<boolean> {
    const autenticado: boolean = await this.authService.autenticado();

    if (!autenticado) {
      this.router.navigate(['/autenticacao/login']);
      return false;
    }

    const role = this.authService.getUsuarioRole();
    const firstSegment = segments[0]?.path;

    const requiredRole = pathToRole[firstSegment];

    if (requiredRole && role !== requiredRole) {
      this.router.navigate(['/autenticacao/login']);
      return false;
    }

    return true;
  }
}
