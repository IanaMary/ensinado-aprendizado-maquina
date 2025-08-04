import { NgModule } from '@angular/core';
import { ViewProfessorRoutingModule } from '../view-professor/view-professor-routing.module';
import { ViewAlunoComponent } from './containers/view-aluno.component';
import { ViewAlunoRoutingModule } from './view-aluno-routing.module';
import { DashboardModule } from '../../dashboard/dashboard.module';


@NgModule({
  declarations: [
    ViewAlunoComponent,
  ],
  imports: [
    ViewAlunoRoutingModule,
    DashboardModule
  ],
  providers: []
})
export class ViewAlunoModule { }
