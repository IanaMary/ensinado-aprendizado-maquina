import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AtividadeService } from './service/atividade/atividade.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: false
})
export class AppComponent {
  title = 'ensinado-aprendizado-maquina';

  // Injeta cedo para iniciar a telemetria (navegação, flush periódico) no boot.
  constructor(private _atividade: AtividadeService) {}
}
