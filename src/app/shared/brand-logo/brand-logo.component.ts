import { Component, Input } from '@angular/core';

/**
 * Logo institucional do Hub de Inovação em IA (identidade visual H2IA).
 * Variantes: `positivo` (escuro, p/ fundos claros), `negativo` (branco, p/ fundos
 * escuros) e `marca` (só o símbolo "iA"). Assets em `src/assets/brand/`.
 */
@Component({
  selector: 'app-brand-logo',
  templateUrl: './brand-logo.component.html',
  styleUrls: ['./brand-logo.component.scss'],
  standalone: false,
})
export class BrandLogoComponent {
  @Input() variante: 'positivo' | 'negativo' | 'marca' = 'positivo';
  @Input() altura = 32;
  /**
   * Largura em px. Quando informada, prevalece sobre `altura` (a altura passa a ser
   * automática). É a forma natural de dimensionar os lockups `positivo`/`negativo`, que
   * são bem mais largos que altos (906×278).
   *
   * Os PNGs foram recortados em 2026-07-26: antes vinham numa tela 16:9 com 79% de
   * transparência, e `altura` mentia (60px do arquivo rendiam ~19px de arte). Hoje as duas
   * medidas são honestas — se voltar a trocar o asset, confira o `getbbox()` do alfa.
   */
  @Input() largura?: number;

  private static readonly MAPA: Record<string, string> = {
    positivo: 'assets/brand/hub-ia-positivo.png',
    negativo: 'assets/brand/hub-ia-negativo.png',
    marca: 'assets/brand/simbolo-ia.png',
  };

  get src(): string {
    return BrandLogoComponent.MAPA[this.variante] || BrandLogoComponent.MAPA['positivo'];
  }

  get alt(): string {
    return this.variante === 'marca' ? 'iA' : 'Hub de Inovação em Inteligência Artificial';
  }
}
