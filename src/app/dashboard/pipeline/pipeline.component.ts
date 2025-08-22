import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../service/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-pipeline',
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.scss'],
  standalone: false,
})
export class PipelineComponent implements OnInit {

  role: string = sessionStorage.getItem('role') || '';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private dialog: MatDialog) { }

  ngOnInit() {

  }

  navegar(bool: boolean) {
    this.dialog.closeAll();
    if (bool) {
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      this.auth.limparSessionStorage();
      this.router.navigate(['/autenticacao/login']);
    }
  }

}
