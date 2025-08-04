import { NgModule } from '@angular/core';
import { ViewAdminComponent } from './containers/view-admin.component';
import { ViewAdminRoutingModule } from './view-admin-routing.module';


@NgModule({
  declarations: [
    ViewAdminComponent,
  ],
  imports: [
    ViewAdminRoutingModule,
  ],
  providers: []
})
export class ViewAdminModule { }
