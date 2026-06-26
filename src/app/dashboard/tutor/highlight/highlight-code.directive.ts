import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
import { HighlightService } from './highlight.service';

/**
 * Renderiza código com coloração de sintaxe (highlight.js lazy).
 * Uso: <code [appHighlightCode]="codigo" lang="python"></code>
 *
 * Fallback robusto: se o import do highlight.js falhar (ex.: offline), o código
 * é exibido como texto puro — nunca some.
 */
@Directive({
  selector: '[appHighlightCode]',
  standalone: false,
})
export class HighlightCodeDirective implements OnChanges {
  @Input('appHighlightCode') code = '';
  @Input() lang = 'python';

  constructor(private el: ElementRef<HTMLElement>, private highlighter: HighlightService) {}

  ngOnChanges(): void {
    const codigo = this.code ?? '';
    // Texto puro primeiro (garante conteúdo mesmo se o highlight falhar/atrasar).
    this.el.nativeElement.textContent = codigo;
    this.el.nativeElement.classList.add('hljs', 'language-' + this.lang);
    if (!codigo.trim()) return;
    this.highlighter
      .highlight(codigo, this.lang)
      .then((html) => {
        this.el.nativeElement.innerHTML = html;
      })
      .catch(() => {
        /* mantém o texto puro já definido */
      });
  }
}
