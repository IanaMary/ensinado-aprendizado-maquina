import { NgModule } from '@angular/core';
import { ViewAdminComponent } from './containers/view-admin.component';
import { ViewAdminRoutingModule } from './view-admin-routing.module';
import { SharedModule } from '../../shared/shared.module';


@NgModule({
  declarations: [
    ViewAdminComponent,
  ],
  imports: [
    ViewAdminRoutingModule,
    SharedModule,
  ],
  providers: []
})
export class ViewAdminModule { }
