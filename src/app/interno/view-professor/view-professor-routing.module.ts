import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewProfessorComponent } from './containers/view-professor.component';

const routes: Routes = [
  {
    path: '',
    component: ViewProfessorComponent,
    data: {
      breadcrumb: ''
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewProfessorRoutingModule { }