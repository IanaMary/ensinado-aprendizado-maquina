import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-view-admin',
  templateUrl: './view-admin.component.html',
  styleUrls: ['./view-admin.component.scss'],
  standalone: false
})
export class ViewAdminComponent implements OnInit {

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute) { }


  ngOnInit() { }

  navegar(bool: boolean) {
    if (bool) {
      this.router.navigate(['conf-pipeline'], { relativeTo: this.route });
    } else {
      this.router.navigate(['dashboard'], { relativeTo: this.route });
    }
  }
}
