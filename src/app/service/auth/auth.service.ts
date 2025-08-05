import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  autenticado(): Promise<boolean> {
    return new Promise((resolve) => {
      const usuario = this.getToken();
      if (usuario) {
        resolve(true);
      }
      resolve(false);
    });
  }

  salvarUsuarioSessionStorage(usuario: any): Promise<any> {
    return new Promise((resolve) => {
      sessionStorage.setItem('id', usuario?.usuario?._id);
      sessionStorage.setItem('token', usuario.access_token);
      sessionStorage.setItem('name', usuario?.usuario?.name);
      sessionStorage.setItem('role', usuario?.usuario?.role);
      resolve(true);
    });
  }

  limparSessionStorage(): Promise<any> {
    return new Promise<any>((resolve) => {
      sessionStorage.clear();
      sessionStorage.clear();
      resolve(true);
    });
  }

  getToken() {
    return sessionStorage.getItem('token');
  }

  getUsuarioRole(): string {
    return sessionStorage.getItem('role') || '';
  }

}