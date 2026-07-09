import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Handler global de erros. Caso especial: falha ao carregar um chunk lazy
 * (deploy publicou um build novo e a aba aberta ainda referencia chunks
 * antigos) — recarrega a página UMA vez para pegar o index/bundles novos,
 * com guarda em sessionStorage para nunca entrar em loop de reload.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private static readonly CHAVE_RELOAD = 'h2ia-chunk-reload-em';
  private static readonly JANELA_MS = 60_000;

  handleError(error: any): void {
    const msg = String(error?.message || error?.rejection?.message || error || '');
    const chunkFalhou = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(msg);

    if (chunkFalhou) {
      const ultimo = Number(sessionStorage.getItem(GlobalErrorHandler.CHAVE_RELOAD) || 0);
      if (Date.now() - ultimo > GlobalErrorHandler.JANELA_MS) {
        sessionStorage.setItem(GlobalErrorHandler.CHAVE_RELOAD, String(Date.now()));
        window.location.reload();
        return;
      }
    }

    console.error(error);
  }
}
