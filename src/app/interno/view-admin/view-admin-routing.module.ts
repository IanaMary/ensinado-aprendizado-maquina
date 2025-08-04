import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewAdminComponent } from './containers/view-admin.component';

const routes: Routes = [
  {
    path: '',
    component: ViewAdminComponent,
    data: {
      breadcrumb: ''
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ViewAdminRoutingModule { }