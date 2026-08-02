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
    sessionStorage.setItem('id', usuario?.usuario?._id);
    sessionStorage.setItem('token', usuario.access_token);
    sessionStorage.setItem('name', usuario?.usuario?.nome_usuario || usuario?.usuario?.name);
    sessionStorage.setItem('role', usuario?.usuario?.role);
    // Preferência de profundidade do tutor: vem do perfil no login para o painel já abrir
    // no nível certo (sem esperar uma chamada extra).
    sessionStorage.setItem('nivel_tutor',
      usuario?.usuario?.nivel_tutor === 'avancado' ? 'avancado' : 'basico');
    return Promise.resolve(true);
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

  /** Encerra a sessão e RECARREGA a aplicação.
   *
   *  Antes era `router.navigate`, que numa SPA não reinicia nada: os `BehaviorSubject` do
   *  `DashboardService` continuavam com os itens do pipeline, e modais e drawers seguiam abertos.
   *  No login seguinte a Área de Trabalho reaparecia montada, mas `idColeta`/`configuracaoTreinamento`
   *  tinham ido embora com o `sessionStorage` — daí "IDs ausentes" ao treinar (apontado pela banca,
   *  Imagens 9, 10 e 11).
   *
   *  Um reload zera tudo de uma vez. A alternativa — cada serviço registrar a própria limpeza —
   *  depende de ninguém esquecer um serviço, e é justamente esse esquecimento que produz o
   *  defeito de novo, em outra forma. */
  logout(): void {
    sessionStorage.clear();
    this.recarregarNoLogin();
  }

  /** Ponto único de saída, isolado para o teste poder substituí-lo: chamar `location.assign` de
   *  verdade recarregaria o próprio runner. */
  protected recarregarNoLogin(): void {
    const base = document.querySelector('base')?.getAttribute('href') || '/';
    window.location.assign(`${base.replace(/\/$/, '')}/autenticacao/login?expirado=1`);
  }
}
