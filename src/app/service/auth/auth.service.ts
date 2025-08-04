import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  isAuthenticated(): Promise<boolean> {
    return new Promise((resolve) => {
      const usuario = this.getAuthorizationToken();
      if (usuario) {
        resolve(true);
      }
      resolve(false);
    });
  }

  saveLocalStorage(usuario: any): Promise<any> {
    return new Promise((resolve) => {
      localStorage.setItem('id', usuario?.usuario?._id);
      localStorage.setItem('token', usuario.access_token);
      localStorage.setItem('name', usuario?.usuario?.name);
      localStorage.setItem('role', usuario?.usuario?.role);
      resolve(true);
    });
  }

  removeLocalStorage(): Promise<any> {
    return new Promise<any>((resolve) => {
      sessionStorage.clear();
      localStorage.clear();
      resolve(true);
    });
  }

  getAuthorizationToken() {
    return localStorage.getItem('token');
  }

  getUsuarioRole(): string {
    return localStorage.getItem('role') || '';
  }

}