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

  private static readonly MAPA: Record<string, string> = {
    positivo: 'assets/brand/hub-ia-positivo.png',
    negativo: 'assets/brand/hub-ia-negativo.png',
    marca: 'assets/brand/apple-touch-icon.png',
  };

  get src(): string {
    return BrandLogoComponent.MAPA[this.variante] || BrandLogoComponent.MAPA['positivo'];
  }

  get alt(): string {
    return this.variante === 'marca' ? 'iA' : 'Hub de Inovação em Inteligência Artificial';
  }
}
