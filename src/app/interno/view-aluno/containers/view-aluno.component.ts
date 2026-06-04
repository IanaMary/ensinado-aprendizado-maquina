import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-aluno',
  templateUrl: './view-aluno.component.html',
  styleUrls: ['./view-aluno.component.scss'],
  standalone: false
})
export class ViewAlunoComponent {

  constructor(private router: Router) {}

  navegarParaProjetos(): void {
    this.router.navigate(['/interno/view-aluno/projetos']);
  }

  navegarParaGaleria(): void {
    this.router.navigate(['/interno/view-aluno/galeria']);
  }
}
