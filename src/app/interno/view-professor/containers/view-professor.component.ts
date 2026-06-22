import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-view-professor',
  templateUrl: './view-professor.component.html',
  styleUrls: ['./view-professor.component.scss'],
  standalone: false
})
export class ViewProfessorComponent {

  constructor(private router: Router) { }

  irAtividades() {
    this.router.navigate(['/atividades']);
  }
}
