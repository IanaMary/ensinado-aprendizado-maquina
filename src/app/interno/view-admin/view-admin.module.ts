import { NgModule } from '@angular/core';
import { ViewAdminComponent } from './containers/view-admin.component';
import { ViewAdminRoutingModule } from './view-admin-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { DashboardModule } from '../../dashboard/dashboard.module';
import { ConfTutorModule } from '../conf-tutor/conf-tutor.module';


@NgModule({
  declarations: [
    ViewAdminComponent,
  ],
  imports: [
    ViewAdminRoutingModule,
    SharedModule,
    DashboardModule,
    ConfTutorModule,
  ],
  providers: []
})
export class ViewAdminModule { }
