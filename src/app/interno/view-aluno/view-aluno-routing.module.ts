import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewAlunoComponent } from './containers/view-aluno.component';

const routes: Routes = [
  {
    path: '',
    component: ViewAlunoComponent,
    data: {
      breadcrumb: ''
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewAlunoRoutingModule { }