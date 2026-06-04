import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewAlunoComponent } from './containers/view-aluno.component';
import { ViewAlunoRoutingModule } from './view-aluno-routing.module';
import { DashboardModule } from '../../dashboard/dashboard.module';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';


@NgModule({
  declarations: [
    ViewAlunoComponent,
  ],
  imports: [
    CommonModule,
    ViewAlunoRoutingModule,
    DashboardModule,
    MatIconModule,
    MatTooltipModule
  ],
  providers: []
})
export class ViewAlunoModule { }
