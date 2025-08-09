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

  navegar(rota: string) {
    this.router.navigate([rota], { relativeTo: this.route });
  }
}
