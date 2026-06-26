import { ElementRef } from '@angular/core';
import { HighlightCodeDirective } from './highlight-code.directive';
import { HighlightService } from './highlight.service';

describe('HighlightCodeDirective', () => {
  function setup(highlightImpl: (c: string) => Promise<string>) {
    const el = document.createElement('code');
    const service = { highlight: jasmine.createSpy('highlight').and.callFake(highlightImpl) } as unknown as HighlightService;
    const dir = new HighlightCodeDirective(new ElementRef(el), service);
    return { el, service, dir };
  }

  it('coloca o texto puro imediatamente e depois aplica o HTML destacado', async () => {
    const { el, dir } = setup((c) => Promise.resolve(`<span class="hljs-keyword">${c}</span>`));
    dir.code = 'import os';
    dir.ngOnChanges();
    // texto puro imediato (antes da promise resolver)
    expect(el.textContent).toBe('import os');
    await Promise.resolve();
    await Promise.resolve();
    expect(el.innerHTML).toContain('hljs-keyword');
  });

  it('mantém o texto puro quando o highlight falha (fallback offline)', async () => {
    const { el, dir } = setup(() => Promise.reject(new Error('offline')));
    dir.code = 'print(1)';
    dir.ngOnChanges();
    await Promise.resolve();
    await Promise.resolve();
    expect(el.textContent).toBe('print(1)');
  });

  it('não chama o highlighter para código vazio', () => {
    const { service, dir } = setup(() => Promise.resolve(''));
    dir.code = '   ';
    dir.ngOnChanges();
    expect((service.highlight as jasmine.Spy)).not.toHaveBeenCalled();
  });
});
