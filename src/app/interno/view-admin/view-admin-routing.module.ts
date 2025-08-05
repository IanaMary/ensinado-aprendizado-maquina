import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ViewAdminComponent } from './containers/view-admin.component';
import { DashboardComponent } from '../../dashboard/dashboard.component';
import { ConfPipelineComponent } from '../conf-pipeline/containers/conf-pipeline.component';

const routes: Routes = [
  {
    path: '',
    component: ViewAdminComponent,
    data: {
      breadcrumb: ''
    }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: {
      breadcrumb: ''
    }
  },
  {
    path: 'conf-pipeline',
    component: ConfPipelineComponent,
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