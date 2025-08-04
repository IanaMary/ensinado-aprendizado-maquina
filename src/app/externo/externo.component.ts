import { Component } from '@angular/core';

@Component({
  selector: 'app-externo',
  template: `
    <router-outlet></router-outlet>
  `,
  standalone: false
})

export class ExternoComponent {

  constructor() { }
}
