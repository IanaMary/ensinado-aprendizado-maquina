import { Component, Input, OnChanges } from '@angular/core';
import tutor from '../../constants/tutor.json';

interface TutorItem {
  texto: string;
  itens?: string[];
}

@Component({
  selector: 'app-tutor',
  templateUrl: './tutor.component.html',
  styleUrls: ['./tutor.component.scss'],
  standalone: false
})
export class TutorComponent implements OnChanges {

  @Input() tutorGeral: any;
  @Input() resumo: string[] = [];
  @Input() explicacao: string[] = [];

  tutorTextoSimples = '';
  normalizadoTutor: TutorItem[] = [];

  tutor = tutor;

  ngOnChanges(): void {
    this.normalizadoTutor = this.normalizarTutor();
  }

  normalizarTutor(): TutorItem[] {
    const valor = this.tutorGeral;
    if (!valor) return [];

    // Tipo 1 → Array de objetos com texto/itens
    if (Array.isArray(valor) && valor.every((v: any) => typeof v === 'object' && 'texto' in v)) {
      return valor.map((v: any) => ({
        texto: String(v.texto),
        itens: Array.isArray(v.itens) ? v.itens.map((i: any) => String(i)) : []
      }));
    }

    // Tipo 3 → Array simples de strings
    if (Array.isArray(valor) && valor.every((v: any) => typeof v === 'string')) {
      return [{ texto: '', itens: valor.map((i: any) => String(i)) }];
    }

    // Tipo 2 → String simples
    if (typeof valor === 'string') {
      return [{ texto: valor }];
    }

    // Caso venha algo inesperado, força para string
    return [{ texto: String(valor) }];
  }
}
