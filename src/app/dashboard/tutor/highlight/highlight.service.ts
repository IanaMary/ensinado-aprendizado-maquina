import { Injectable } from '@angular/core';

/**
 * Carrega o highlight.js de forma LAZY (import dinâmico) e só com o core + a
 * linguagem Python — mantém o pacote completo (~900 KB) fora do bundle inicial.
 * O motor é memoizado: o import acontece no máximo uma vez por sessão.
 */
@Injectable({ providedIn: 'root' })
export class HighlightService {
  private engine?: Promise<any>;

  private load(): Promise<any> {
    if (!this.engine) {
      this.engine = (async () => {
        const core = (await import('highlight.js/lib/core')).default;
        const python = (await import('highlight.js/lib/languages/python')).default;
        core.registerLanguage('python', python);
        return core;
      })();
    }
    return this.engine;
  }

  /** Devolve o HTML com tokens destacados. Lança se o highlight falhar. */
  async highlight(code: string, lang = 'python'): Promise<string> {
    const hljs = await this.load();
    return hljs.highlight(code, { language: lang }).value;
  }
}
