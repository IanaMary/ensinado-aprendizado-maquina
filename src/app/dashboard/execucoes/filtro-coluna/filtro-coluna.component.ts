import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-filtro-coluna',
  templateUrl: './filtro-coluna.component.html',
  styleUrls: ['./filtro-coluna.component.scss'],
  standalone: false
})
export class FiltroColunaComponent {
  @Input() id = '';
  @Input() label = '';
  @Input() opcoes: string[] = [];
  @Input() value = '';

  @Output() valueChange = new EventEmitter<string>();

  onChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.valueChange.emit(select.value);
  }

  onChangeManual(valor: string): void {
    this.value = valor;
    this.onChange({ target: { value: valor } } as any);
  }
  
  
}
