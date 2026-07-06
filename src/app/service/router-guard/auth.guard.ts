import { Injectable } from '@angular/core';
import { CanLoad, Route, UrlSegment, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { roleMap } from '../../../app/models/item-coleta-dado.model';

// Rotas (1º segmento) que cada papel pode carregar. O aluno tem MÚLTIPLAS entradas
// (seletor /inicio + as três experiências), então não é uma rota única — isso também
// faz o refresh funcionar em qualquer uma delas.
// Admin/professor também carregam as rotas de projeto (projetos/trilha/galeria):
// abrir um projeto salvo navega para lá, e sem isto o guard mandava-os ao login
// (parecia "deslogar") ao carregar um pipeline.
const ROTAS_POR_PAPEL: Record<string, string[]> = {
  aluno: ['inicio', 'treine-robo', 'leo-mundo-real', 'trilha', 'projetos', 'galeria', 'entrar'],
  professor: ['view-professor', 'atividades', 'projetos', 'trilha', 'galeria', 'entrar'],
  admin: ['view-admin', 'view-professor', 'atividades', 'projetos', 'trilha', 'galeria', 'entrar'],
};

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanLoad {
  constructor(private authService: AuthService, private router: Router) { }

  async canLoad(route: Route, segments: UrlSegment[]): Promise<boolean> {
    const autenticado: boolean = await this.authService.autenticado();

    if (!autenticado) {
      // Preserva o destino (com query, ex.: /entrar?codigo=XXX do QR) para voltar após
      // o login — senão o ?codigo se perde e o aluno não entra na turma.
      const nav = this.router.getCurrentNavigation?.();
      const destino = nav?.extractedUrl?.toString() || ('/' + segments.map(s => s.path).join('/'));
      if (destino && destino !== '/' && !destino.startsWith('/autenticacao')) {
        sessionStorage.setItem('returnUrl', destino);
      }
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
      // Autenticado, mas a rota não é do papel: manda para a HOME do papel — não
      // para o login (não deslogar quem está autenticado).
      const home = roleMap[role] || `/${permitidas[0]}`;
      this.router.navigate([home]);
      return false;
    }

    return true;
  }
}
