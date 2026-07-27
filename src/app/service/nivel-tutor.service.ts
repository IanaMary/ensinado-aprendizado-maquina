import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type NivelTutor = 'basico' | 'avancado';

const CHAVE_SESSAO = 'nivel_tutor';

/**
 * Profundidade que o aluno escolheu para o tutor (Básico ou Avançado).
 *
 * É preferência de PERFIL, não estado de tela: antes cada painel do tutor nascia em Básico e
 * a escolha se perdia ao recarregar a página. Agora vale para os três painéis (área de
 * trabalho, assistente e dica de gráfico), sobrevive ao F5 e acompanha o aluno em qualquer
 * máquina — e o mesmo nível vai no contexto do chat, então o tutor responde na profundidade
 * que ele está lendo.
 *
 * O `sessionStorage` é só cache de partida (o valor chega no login); a fonte é o perfil.
 */
@Injectable({ providedIn: 'root' })
export class NivelTutorService {
  private readonly nivel$ = new BehaviorSubject<NivelTutor>(this.lerDaSessao());

  constructor(private http: HttpClient) {}

  get nivel(): NivelTutor {
    return this.nivel$.value;
  }

  get avancado(): boolean {
    return this.nivel$.value === 'avancado';
  }

  observar(): Observable<NivelTutor> {
    return this.nivel$.asObservable();
  }

  /** Aplica o valor que veio do login, sem gravar de volta no servidor. */
  definirLocal(nivel?: string | null): void {
    const valor: NivelTutor = nivel === 'avancado' ? 'avancado' : 'basico';
    sessionStorage.setItem(CHAVE_SESSAO, valor);
    if (valor !== this.nivel$.value) this.nivel$.next(valor);
  }

  /** Troca do toggle: reflete na hora e persiste no perfil (falha silenciosa). */
  definir(nivel: NivelTutor): void {
    this.definirLocal(nivel);
    this.http.put(`${environment.apiUrl}usuario/preferencias`, { nivel_tutor: nivel })
      .subscribe({ error: () => { } });
  }

  private lerDaSessao(): NivelTutor {
    return sessionStorage.getItem(CHAVE_SESSAO) === 'avancado' ? 'avancado' : 'basico';
  }
}
