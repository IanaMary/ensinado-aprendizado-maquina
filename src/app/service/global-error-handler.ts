import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Handler global de erros. Caso especial: falha ao carregar um chunk lazy
 * (deploy publicou um build novo e a aba aberta ainda referencia chunks
 * antigos) — recarrega a página no máximo MAX_TENTATIVAS vezes por sessão,
 * com contador em sessionStorage. Se o chunk realmente não existir no servidor
 * (não apenas cache defasado), o reload para e o erro é logado.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private static readonly CHAVE_TENTATIVAS = 'h2ia-chunk-reload-tentativas';
  private static readonly MAX_TENTATIVAS = 2;

  handleError(error: any): void {
    const msg = String(error?.message || error?.rejection?.message || error || '');
    const chunkFalhou = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(msg);

    if (chunkFalhou) {
      const tentativas = Number(sessionStorage.getItem(GlobalErrorHandler.CHAVE_TENTATIVAS) || 0);
      if (tentativas < GlobalErrorHandler.MAX_TENTATIVAS) {
        sessionStorage.setItem(GlobalErrorHandler.CHAVE_TENTATIVAS, String(tentativas + 1));
        window.location.reload();
        return;
      }
    }

    console.error(error);
  }
}
