import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../service/auth/auth.service';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-conf-pipeline',
  templateUrl: './conf-pipeline.component.html',
  styleUrls: ['./conf-pipeline.component.scss'],
  standalone: true,
  imports: [MatTabsModule]
})
export class ConfPipelineComponent implements OnInit {

  role: string = sessionStorage.getItem('role') || '';

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService) { }


  ngOnInit() { }

  navegar(bool: boolean) {
    if (bool) {
      this.router.navigate(['../'], { relativeTo: this.route });
    } else {
      this.auth.limparSessionStorage();
      this.router.navigate(['/autenticacao/login']);
    }
  }

}
