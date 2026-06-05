import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private router: Router) { }

  /**
   * Verifica se o token existe e não expirou.
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp < Date.now() / 1000) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Alias para isAuthenticated() para manter compatibilidade.
   */
  autenticado(): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(this.isAuthenticated());
    });
  }

  salvarUsuarioSessionStorage(usuario: any): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        sessionStorage.setItem('id', usuario?.usuario?._id);
        sessionStorage.setItem('token', usuario.access_token);
        sessionStorage.setItem('name', usuario?.usuario?.nome_usuario || usuario?.usuario?.name);
        sessionStorage.setItem('role', usuario?.usuario?.role);
        resolve(true);
      }, 0);
    });
  }

  limparSessionStorage(): Promise<any> {
    return new Promise<any>((resolve) => {
      sessionStorage.clear();
      resolve(true);
    });
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  getUsuarioRole(): string {
    return sessionStorage.getItem('role') || '';
  }

  getUser(): any {
    const token = this.getToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }

  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['/autenticacao/login'], { queryParams: { expirado: 1 } });
  }
}