import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/** Mantém viva a sessão de quem está usando o sistema.
 *
 *  O token não era renovado: o aluno era deslogado no meio de uma atividade, sem aviso (apontado
 *  pela banca, Imagem 10). A duração é do servidor (`TOKEN_EXPIRE_MINUTES`, 240 min desde 04/08) e
 *  este serviço não a conhece — só lê o `exp` do próprio token. Aqui a renovação é disparada pela PRÓPRIA atividade —
 *  toda requisição bem-sucedida passa por `aoUsar()` —, então a sessão só cai depois de
 *  inatividade de verdade. Sem timer de fundo: um timer renovaria a sessão de uma aba esquecida
 *  aberta, que é exatamente o que a expiração deve encerrar.
 */
@Injectable({ providedIn: 'root' })
export class SessaoRenovacaoService {
  /** Renova quando falta menos que isto para expirar. */
  private readonly MARGEM_SEGUNDOS = 15 * 60;
  private renovando = false;

  constructor(private http: HttpClient, private auth: AuthService) { }

  /** Chamado a cada resposta bem-sucedida. Barato: só decodifica o token e compara o tempo. */
  aoUsar(): void {
    if (this.renovando) return;
    if (!this.precisaRenovar()) return;

    this.renovando = true;
    this.http.post<{ access_token: string }>(`${environment.apiUrl}login/renovar`, {}).subscribe({
      next: (res) => {
        if (res?.access_token) sessionStorage.setItem('token', res.access_token);
        this.renovando = false;
      },
      // Falhou? Não desloga nem avisa: o token atual ainda vale por vários minutos e a próxima
      // requisição tenta de novo. Deslogar aqui seria pior que o defeito original.
      error: () => { this.renovando = false; },
    });
  }

  /** True quando o token existe, é legível e está perto de expirar. */
  precisaRenovar(): boolean {
    const token = this.auth.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload?.exp) return false;
      const restante = payload.exp - Date.now() / 1000;
      return restante > 0 && restante < this.MARGEM_SEGUNDOS;
    } catch {
      return false;
    }
  }
}
