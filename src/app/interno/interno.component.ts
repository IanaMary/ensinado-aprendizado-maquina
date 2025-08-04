import { Component } from '@angular/core';

@Component({
  selector: 'app-page',
  template: `
  <div>
    <router-outlet></router-outlet>
  </div>
  `,
  standalone: false,

})
export class InternoComponent {

  constructor() { }

}