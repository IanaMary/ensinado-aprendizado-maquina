import { AfterViewChecked, Directive, ElementRef } from '@angular/core';
import { HighlightService } from './highlight.service';

/**
 * Realça (highlight.js, lazy) os code fences já renderizados dentro do host —
 * usado nas mensagens do chat, cujo markdown vira `<pre class="md-code"><code>`.
 * Cada bloco é processado uma única vez (marcador data-hl).
 */
@Directive({
  selector: '[appRealcarBlocos]',
  standalone: true,
})
export class RealcarBlocosDirective implements AfterViewChecked {
  constructor(private el: ElementRef<HTMLElement>, private highlightService: HighlightService) {}

  ngAfterViewChecked(): void {
    const blocos = this.el.nativeElement.querySelectorAll<HTMLElement>('pre.md-code code:not([data-hl])');
    blocos.forEach(code => {
      code.setAttribute('data-hl', '1');
      const texto = code.textContent || '';
      if (!texto.trim()) return;
      this.highlightService.highlight(texto, 'python')
        .then(html => {
          code.classList.add('hljs', 'language-python');
          code.innerHTML = html;
        })
        .catch(() => { /* segue sem cor */ });
    });
  }
}
