// session.service.ts
import { Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly STORAGE_KEY = 'my_app_session_id';
  private readonly FLAG_KEY = 'my_app_tab_open';

  constructor() { }

  getSessionId(): string {
    return localStorage.getItem(this.STORAGE_KEY) || '';
  }

  getColetaId(): string {
    return sessionStorage.getItem('idColeta') || '';
  }

  setColetaId(idColeta: string) {
    sessionStorage.setItem('idColeta', idColeta);
  }

  getConfigurcaoTreinamento(): string {
    return sessionStorage.getItem('configurcaoTreinamento') || '';
  }

  setConfigurcaoTreinamento(configurcaoTreinamento: string) {
    sessionStorage.setItem('configurcaoTreinamento', configurcaoTreinamento);
  }
}
