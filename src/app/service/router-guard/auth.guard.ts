import { Injectable } from '@angular/core';
import { CanLoad, Route, UrlSegment, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { roleMap } from '../../../app/models/item-coleta-dado.model';

// Rotas (1º segmento) que cada papel pode carregar. O aluno tem MÚLTIPLAS entradas
// (seletor /inicio + as três experiências), então não é uma rota única — isso também
// faz o refresh funcionar em qualquer uma delas.
const ROTAS_POR_PAPEL: Record<string, string[]> = {
  aluno: ['inicio', 'treine-robo', 'leo-mundo-real', 'trilha', 'projetos', 'galeria'],
  professor: ['view-professor', 'atividades'],
  admin: ['view-admin', 'atividades'],
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
    // Conjunto de rotas do papel; fallback para a rota única do roleMap se papel desconhecido.
    const permitidas = ROTAS_POR_PAPEL[role]
      ?? ([roleMap[role]?.replace(/^\//, '')].filter(Boolean) as string[]);

    // Papel sem rotas conhecidas (ausente/inválido) → nega, mesmo autenticado.
    if (!permitidas.length) {
      this.router.navigate(['/autenticacao/login']);
      return false;
    }

    if (firstSegment && !permitidas.includes(firstSegment)) {
      this.router.navigate(['/autenticacao/login']);
      return false;
    }

    return true;
  }
}
